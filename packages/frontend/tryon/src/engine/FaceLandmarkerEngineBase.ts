import type {
  FaceLandmarker,
  FaceLandmarkerResult,
  NormalizedLandmark,
} from '@mediapipe/tasks-vision';

import type {
  IApplyEffectParams,
  IEngineOptions,
  IMakeupState,
  TRGBTuple,
  TRunningMode,
} from '../types/index.js';
import {
  captureSnapShot,
  getFaceDetectionStatus,
  renderCompareSlider,
  resizeElements,
} from '../utils/index.js';
import { getSharedFaceLandmarker } from './FaceLandmarkerCache.js';
import { TRYON_LOAD_ERROR, TryOnStateEngine } from './TryOnStateEngine.js';

/**
 * Category-agnostic engine machinery shared by every Try-On category (LIP today, EYE/FACE/
 * HAIR later): state pub-sub, abort-safe lifecycle, canvas sizing, the compare-slider
 * split-screen render, and snapshot capture. Ported from the reference implementation's
 * `<Category>BaseClass` pattern, generalized over `TState`/`TAssets` so this file is written
 * once - a category only ever needs to extend it and fill in the five abstract members below,
 * never touch this file.
 *
 * The state pub-sub/lifecycle bookkeeping itself (`TryOnStateEngine`) and the compare-slider draw
 * (`renderCompareSlider`) are both shared with `HairSegmenterEngineBase`/`HandLandmarkerEngineBase`
 * via composition, not a common parent class those two would extend - see those two files' own
 * comments on why a deeper shared ancestor isn't the right shape here (the detector-loading/render
 * code that genuinely differs between the three stays inline in each file instead of being
 * scattered across abstract hook methods on one ancestor).
 *
 * `TAssets` is whatever a category needs loaded once before rendering can start (LIP loads 6
 * texture images; a color-only category like blush/foundation would use `null`).
 */
export abstract class FaceLandmarkerEngineBase<TState extends IMakeupState, TAssets = null> {
  protected canvas1: HTMLCanvasElement;
  protected canvas2: HTMLCanvasElement;
  // What the engine was given besides its canvases and its state: where its files are.
  protected readonly options: IEngineOptions;

  protected landmarker: FaceLandmarker | null = null;
  protected landmark: FaceLandmarkerResult | null = null;
  protected assets: TAssets | null = null;

  protected comparePosition: number | null = null;
  protected isMirrored = false;

  private readonly stateEngine: TryOnStateEngine<TState>;

  constructor(
    canvas1: HTMLCanvasElement,
    canvas2: HTMLCanvasElement,
    initialState?: Partial<TState>,
    options?: IEngineOptions,
  ) {
    this.canvas1 = canvas1;
    this.canvas2 = canvas2;
    this.options = options ?? {};
    this.stateEngine = new TryOnStateEngine(
      () => this.getInitialState(),
      () => {
        this.onStateUpdated();
      },
      initialState,
    );
  }

  /* ================= STATE ================= */

  // Thin aliases onto `stateEngine` - kept as same-named getters (rather than renaming every
  // `this.state`/`this.cachedRGB` read below to `this.stateEngine.currentState`/`.rgb`) so
  // `renderFrame`/`startTryOn`'s own bodies stay exactly as readable as before this file composed
  // the state engine instead of being it.
  protected get state(): TState {
    return this.stateEngine.currentState;
  }

  protected get cachedRGB(): TRGBTuple | null {
    return this.stateEngine.rgb;
  }

  get currentState(): TState {
    return this.stateEngine.currentState;
  }

  // Flat aliases matching `ITryOnEngineBaseRef` (see `@/types/tryon-types`) - the
  // React wrapper's imperative ref is typed against that plain interface rather than this
  // class directly (see `withLiveCamera`/`withImageUpload`'s comments
  // on why), so these exist purely to give it something to point at.
  public getState(): TState {
    return this.stateEngine.currentState;
  }

  public setMakeupState(partial: Partial<TState>) {
    this.updateState.set(partial);
  }

  public resetState() {
    this.updateState.internalReset();
  }

  public onSourceChange() {
    this.updateState.setCameraReady(false);
    this.updateState.setImageReady(false);
  }

  public setComparePosition(value: number | null) {
    this.comparePosition = value;

    // Upload mode has no continuous render loop, so a compare-slider drag needs to force one.
    if (this.getRunningMode() === 'IMAGE') this.onStateUpdated();
  }

  // Repaints without touching any state - for when only the canvas's *box* changed (window
  // resize/rotate). Upload mode only paints on a state change, so without this the canvas keeps
  // the CSS size `resizeElements` last gave it; Live mode re-fits on every frame already.
  public redraw() {
    if (this.getRunningMode() === 'IMAGE') this.onStateUpdated();
  }

  public setMirror(value: boolean) {
    this.isMirrored = value;
  }

  public getCanvas() {
    return this.canvas2;
  }

  public get updateState() {
    return this.stateEngine.updateState;
  }

  public onChange(listener: (state: TState) => void) {
    return this.stateEngine.onChange(listener);
  }

  /* ================= INIT ================= */

  public async startTryOn(): Promise<void> {
    const { token, signal } = this.stateEngine.beginInit();

    try {
      this.assets = await this.loadCategoryAssets(signal);
      if (signal.aborted || !this.ensureAlive(token)) return;

      this.landmarker = await getSharedFaceLandmarker(
        this.canvas1,
        this.getRunningMode(),
        this.options.assets,
        signal,
      );
      // `signal.aborted` can genuinely flip to `true` while the (possibly long) landmarker
      // load above is in flight - TS just can't statically prove that across an `await` on a
      // live DOM property, hence the disable.
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      if (signal.aborted || !this.ensureAlive(token)) return;

      this.updateState.setTryOnStarted(true);
      await this.onTryOnReady();
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      console.error('startTryOn failed', err);

      // Deliberately NOT `this.cleanup()` - that's the teardown path (see `destroy()` below),
      // and its first line wipes this engine's own listeners. This engine is still mounted and
      // still the exact instance the React wrapper subscribed to via `onChange` - clearing
      // listeners here would permanently sever that connection while the component is still
      // alive, so the `setError` call right below would silently reach nobody and the UI would
      // stay stuck on its loading overlay forever, no error and no way out short of remounting
      // the whole stage. Setup never got far enough to produce a usable landmarker, so only that
      // reference needs dropping.
      this.landmarker = null;
      this.updateState.setError(TRYON_LOAD_ERROR);
    }
  }

  /* ================= RENDER ================= */

  // Lets a category tighten `getFaceDetectionStatus`'s purely position/size-based reading with
  // its own extra condition - only FACE overrides this today (see `FaceEngineBase`'s override),
  // to catch a head turned too far to one side for its full-face finishes' landmark-oval fill to
  // render correctly (see tryon-utils/face.ts's own history on why that specifically needs a
  // frontal-ish pose). Most categories never need this and just inherit this no-op default -
  // deliberately a plain overridable method, not another abstract member every category would
  // have to implement for a check only FACE cares about.
  protected refineDetectionStatus(
    status: TState['detectionStatus'],
    _face: NormalizedLandmark[] | undefined,
  ): TState['detectionStatus'] {
    return status;
  }

  public renderFrame(drawSource: HTMLVideoElement | HTMLImageElement) {
    const ctx = this.canvas2.getContext('2d');
    if (!ctx || !this.landmark) return;

    resizeElements(drawSource, this.canvas1, this.canvas2);

    const width = this.canvas2.width;
    const height = this.canvas2.height;

    ctx.clearRect(0, 0, width, height);

    const face = this.landmark.faceLandmarks[0];
    this.updateState.setDetectionStatus(
      this.refineDetectionStatus(getFaceDetectionStatus(face), face),
    );

    ctx.save();

    // ===== MIRROR (LIVE MODE ONLY) =====
    if (this.isMirrored) {
      ctx.translate(width, 0);
      ctx.scale(-1, 1);
    }

    // Always draw the base frame, even with nothing selected yet.
    ctx.drawImage(drawSource, 0, 0, width, height);

    if (!face || !this.state.color || !this.cachedRGB) {
      ctx.restore();
      return;
    }

    const dimension = { width, height };
    const rgb = this.cachedRGB;
    const applyMakeup = () => {
      this.applyEffect({ face, ctx, dimension, rgb, state: this.state, assets: this.assets });
    };

    renderCompareSlider(ctx, width, height, this.comparePosition, this.isMirrored, applyMakeup);
  }

  /* ================= SNAPSHOT ================= */

  public takeSnapshotInternal(source: HTMLVideoElement | HTMLImageElement) {
    return captureSnapShot(source, this.canvas2);
  }

  /* ================= DETECTION (shared by withLiveCamera/withImageUpload) ================= */

  // The small, uniformly-shaped surface `withLiveCamera.ts`/`withImageUpload.ts` (both fully
  // generic - see their own comments) call into instead of touching `this.landmarker`/
  // `this.landmark` directly - `HairSegmenterEngineBase`/`HandLandmarkerEngineBase` each implement
  // the exact same four methods over their own detector/result fields, which is what lets one
  // shared pair of mixin files attach Live/Upload behavior to any of the three.
  public hasDetector(): boolean {
    return !!this.landmarker;
  }

  // `isStillValid` exists purely so `HairSegmenterEngineBase`'s own implementation (the one
  // genuinely async detector of the three) can re-check it *before* writing a result - nothing
  // happens between the synchronous `detectForVideo` call below and `onDetected()`, so there's
  // nothing new to invalidate in between and no reason to call it here (same as the original,
  // pre-shared-mixin code never re-checking between detect and render for this tracking model).
  public detectFrameForLive(
    video: HTMLVideoElement,
    _isStillValid: () => boolean,
    onDetected: () => void,
  ): void {
    if (!this.landmarker) return;
    this.landmark = this.landmarker.detectForVideo(video, performance.now());
    onDetected();
  }

  public detectFrameForUpload(image: HTMLImageElement): void {
    if (!this.landmarker) return;
    this.landmark = this.landmarker.detect(image);
  }

  public resetDetectionResult(): void {
    this.landmark = null;
  }

  /* ================= LIFECYCLE ================= */

  public ensureAlive(token?: number) {
    return this.stateEngine.ensureAlive(token);
  }

  public destroy() {
    this.stateEngine.markDestroyed();
    this.cleanup();
  }

  public cleanup() {
    this.stateEngine.resetListeners();
    // Deliberately NOT closing `this.landmarker` - it's a shared instance from
    // `FaceLandmarkerCache`, reused by later mounts/categories. Only drop this engine's
    // reference to it.
    this.landmarker = null;
    this.updateState.internalReset();
  }

  /* ================= ABSTRACT (category-specific) ================= */

  protected abstract getRunningMode(): TRunningMode;
  protected abstract onTryOnReady(): Promise<void> | void;
  protected abstract onStateUpdated(): void;
  protected abstract getInitialState(): TState;
  protected abstract loadCategoryAssets(signal: AbortSignal): Promise<TAssets | null>;
  protected abstract applyEffect(params: IApplyEffectParams<TState, TAssets>): void;
}
