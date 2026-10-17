import type {
  IDetectableEngine,
  IEngineOptions,
  IMakeupState,
  ITryOnLiveEngineRef,
  TRunningMode,
} from '../types/index.js';
import {
  getCameraErrorMessage,
  getCameraSupportError,
  type TCameraFailureStage,
} from '../utils/camera.js';

type TEngineConstructor<TState extends IMakeupState> = abstract new (
  canvas1: HTMLCanvasElement,
  canvas2: HTMLCanvasElement,
  initialState?: Partial<TState>,
  options?: IEngineOptions,
) => IDetectableEngine;

/**
 * Attaches webcam (getUserMedia + `requestAnimationFrame` render loop) behavior to *any*
 * category's engine base class. Written once - every category gets Live mode by writing
 * `class <Category>LiveEngine extends withLiveCamera(<Category>EngineBase) {}`, instead of
 * hand-copying this ~90 lines per category (confirmed byte-for-byte duplicate boilerplate in
 * the reference implementation across every category it has).
 *
 * Generic over `IDetectableEngine` rather than any one of `FaceLandmarkerEngineBase`/
 * `HairSegmenterEngineBase`/`HandLandmarkerEngineBase` specifically - this file used to be three
 * near-identical copies (`withLiveCameraFaceLandmarker.ts`/`withLiveCameraHairSegmenter.ts`/
 * `withLiveCameraHandLandmarker.ts`), differing only in the one line that runs detection for a
 * frame and the one field it reset on stop. Both of those now live behind
 * `detectFrameForLive`/`resetDetectionResult` on the engine base itself (see
 * `IDetectableEngine`'s own comment), so this file only needs to exist once.
 */
export function withLiveCamera<TState extends IMakeupState>(
  Base: TEngineConstructor<TState>,
): new (
  canvas1: HTMLCanvasElement,
  canvas2: HTMLCanvasElement,
  initialState?: Partial<TState>,
  options?: IEngineOptions,
) => ITryOnLiveEngineRef<TState> {
  abstract class TryOnLiveEngine extends Base {
    private video: HTMLVideoElement | null = null;
    private stream: MediaStream | null = null;
    private rafId: number | null = null;
    private isRunning = false;
    private restartToken = 0;
    private cameraAbort?: AbortController;

    constructor(
      canvas1: HTMLCanvasElement,
      canvas2: HTMLCanvasElement,
      initialState?: Partial<TState>,
      options?: IEngineOptions,
    ) {
      super(canvas1, canvas2, initialState, options);
      this.setMirror(true);
    }

    // Called by the React wrapper right after mounting the <video> ref, before startCamera().
    public attachVideo(video: HTMLVideoElement) {
      this.video = video;
    }

    /* ================= REQUIRED OVERRIDES ================= */

    protected getRunningMode(): TRunningMode {
      return 'VIDEO';
    }

    protected onTryOnReady() {
      // Engine (detector + assets) is ready - the camera itself is started/stopped by the
      // React wrapper's imperative `startCamera`/`stopCamera`, not automatically here.
    }

    protected onStateUpdated() {
      // Live mode re-renders continuously via the RAF loop below - no forced re-render needed
      // on a plain state change (the compare-slider path is handled separately in the base).
    }

    /* ================= CAMERA ================= */

    public async startCamera() {
      if (!this.video) {
        console.error('startCamera called before attachVideo()');
        return;
      }

      this.cameraAbort?.abort();
      this.cameraAbort = new AbortController();
      const { signal } = this.cameraAbort;

      const token = ++this.restartToken;
      this.isRunning = true;
      this.updateState.setError(undefined);

      // Checked up front rather than left to throw - without a secure context / `mediaDevices`
      // there's nothing to call, and the reason to show differs from every real failure below.
      const unsupported = getCameraSupportError();
      if (unsupported) {
        this.isRunning = false;
        this.updateState.setError(unsupported);
        return;
      }

      // Both `getUserMedia` and the `play()` after it can throw NotAllowedError, but they mean
      // different things (denied permission vs. a blocked autoplay) - so the catch below needs to
      // know which of the two it was.
      let stage: TCameraFailureStage = 'request';

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user' },
          audio: false,
        });

        if (signal.aborted || token !== this.restartToken) {
          stream.getTracks().forEach((track) => {
            track.stop();
          });
          return;
        }

        this.stream = stream;
        stage = 'playback';
        this.video.srcObject = stream;
        await this.video.play();

        // Same "can genuinely change during the await above" reasoning as `startTryOn`'s
        // check in the engine base.
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        if (signal.aborted || token !== this.restartToken) return;

        this.updateState.setCameraReady(true);
        this.loop(token);
      } catch (err) {
        // A newer start/stop already took over this camera - whatever this attempt threw is stale
        // (an intentional teardown also lands here, as an AbortError from `play()`), so it must not
        // touch the newer attempt's state. Any *other* error - including an AbortError the browser
        // raised itself - is a real failure and gets reported below.
        if (signal.aborted || token !== this.restartToken) return;

        console.error('startCamera failed', err);
        // Release whatever was already acquired - a stream whose preview then failed to play would
        // otherwise keep the camera (and its indicator light) on behind the error overlay.
        this.stopCamera();

        this.updateState.setError(getCameraErrorMessage(err, stage));
      }
    }

    public stopCamera() {
      this.cameraAbort?.abort();
      this.cameraAbort = undefined;

      this.restartToken++;
      this.isRunning = false;

      if (this.rafId !== null) {
        cancelAnimationFrame(this.rafId);
        this.rafId = null;
      }

      if (this.stream) {
        this.stream.getTracks().forEach((track) => {
          track.stop();
        });
        this.stream = null;
      }

      if (this.video?.srcObject) {
        this.video.pause();
        this.video.srcObject = null;
      }

      this.resetDetectionResult();

      if (this.ensureAlive()) {
        this.updateState.setCameraReady(false);
      }
    }

    public async restartCamera() {
      this.stopCamera();
      await new Promise((resolve) => {
        setTimeout(resolve, 150);
      });
      await this.startCamera();
    }

    public getStream() {
      return this.stream;
    }

    /* ================= LOOP ================= */

    private loop = (token: number) => {
      if (
        !this.isRunning ||
        token !== this.restartToken ||
        !this.hasDetector() ||
        !this.video ||
        !this.ensureAlive()
      ) {
        return;
      }

      const video = this.video;

      // MediaPipe (or a canvas draw call inside `renderFrame`) throwing mid-frame is rare, but
      // without this try/catch it's silent and total: the throw happens before the
      // `requestAnimationFrame` call below ever runs, so the loop just stops scheduling itself -
      // a frozen last frame, controls still enabled, no error, no indication anything's wrong
      // short of the preview visibly not moving anymore.
      try {
        this.detectFrameForLive(
          video,
          () => token === this.restartToken && this.ensureAlive(),
          () => {
            this.renderFrame(video);
          },
        );
      } catch (err) {
        console.error('Live render loop failed', err);
        this.stopCamera();
        this.updateState.setError({
          title: 'Live preview stopped',
          description: 'Something interrupted the live preview. Tap Retry to restart the camera.',
        });
        return;
      }

      this.rafId = requestAnimationFrame(() => {
        this.loop(token);
      });
    };

    /* ================= SNAPSHOT ================= */

    public takeSnapshot() {
      return this.video ? this.takeSnapshotInternal(this.video) : null;
    }

    public override cleanup() {
      this.stopCamera();
      super.cleanup();
    }
  }

  // `TryOnLiveEngine` really is fully concrete at runtime - `Base` is always a category class
  // that already implements `getInitialState`/`loadCategoryAssets`/`applyEffect` (this mixin
  // only ever touches the other three abstract members). TS can't verify that through a
  // generic `abstract new (...)` parameter type, though, and worse - casting to the engine
  // base *class* type (even concretely) still drags its abstract-member bookkeeping into any
  // `extends` clause built on top of it. Casting to the plain `ITryOnLiveEngineRef` interface
  // instead sidesteps both problems: it's the exact contract the React layer needs, and being a
  // plain interface, it carries none of that baggage - see `LipLiveEngine.ts` for the (now
  // warning-free) result.
  return TryOnLiveEngine as unknown as new (
    canvas1: HTMLCanvasElement,
    canvas2: HTMLCanvasElement,
    initialState?: Partial<TState>,
    options?: IEngineOptions,
  ) => ITryOnLiveEngineRef<TState>;
}
