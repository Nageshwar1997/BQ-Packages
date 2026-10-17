import type {
  Category,
  HandLandmarker,
  Landmark,
  NormalizedLandmark,
} from '@mediapipe/tasks-vision';

import type { IEngineOptions, IMakeupState, TRGBTuple, TRunningMode } from '../types/index.js';
import type { IApplyNailEffectParams } from '../types/nail.js';
import { captureSnapShot, renderCompareSlider, resizeElements } from '../utils/index.js';
import { getHandDetectionStatus } from '../utils/nail.js';
import { getSharedHandLandmarker } from './HandLandmarkerCache.js';
import { TRYON_LOAD_ERROR, TryOnStateEngine } from './TryOnStateEngine.js';

/**
 * `FaceLandmarkerEngineBase`'s counterpart for hand-tracked categories - same state pub-sub,
 * abort-safe lifecycle, canvas sizing, compare-slider split-screen render, and snapshot capture,
 * just built on MediaPipe `HandLandmarker` (a *plural*, multi-hand landmark result) instead of
 * `FaceLandmarker` (a single face). Deliberately a parallel file, not a change to
 * `FaceLandmarkerEngineBase` itself - that class's `startTryOn`/`renderFrame` call
 * `getSharedFaceLandmarker` and read `this.landmark.faceLandmarks[0]` directly (not through any
 * overridable "detector" abstraction), and `IRenderTargetParams`'s base shape carries a
 * single-`face` field that can't represent multiple detected hands. Much closer to
 * `FaceLandmarkerEngineBase`'s own original shape than `HairSegmenterEngineBase` (HAIR's own
 * parallel) had to be, though - `HandLandmarker`'s `detect`/`detectForVideo` are synchronous just
 * like `FaceLandmarker`'s, no callback/mask-lifetime complexity to work around. See
 * docs/tryons/NAIL-PLAN.md's "Engine architecture" section for the full reasoning.
 *
 * The state pub-sub/lifecycle bookkeeping (`TryOnStateEngine`) and the compare-slider draw
 * (`renderCompareSlider`) *are* shared with `FaceLandmarkerEngineBase`/`HairSegmenterEngineBase`,
 * via composition rather than a common parent - see `TryOnStateEngine`'s own comment for why.
 *
 * `TAssets` is whatever a category needs loaded once before rendering can start - `null` for
 * every NAIL finish so far (see `INailAssets`).
 */
export abstract class HandLandmarkerEngineBase<TState extends IMakeupState, TAssets = null> {
  protected canvas1: HTMLCanvasElement;
  protected canvas2: HTMLCanvasElement;
  // What the engine was given besides its canvases and its state: where its files are.
  protected readonly options: IEngineOptions;

  protected handLandmarker: HandLandmarker | null = null;
  protected hands: NormalizedLandmark[][] = [];
  // Real-world-scale companion to `hands` above, same order/length - see `INailRenderTargetParams`'s
  // own comment (types/tryon-types/nail.ts) for why render functions need both.
  protected worldHands: Landmark[][] = [];
  // Same order/length as `hands`/`worldHands` - see `INailRenderTargetParams`'s own comment
  // (types/tryon-types/nail.ts) for why the orientation check needs this.
  protected handedness: Category[][] = [];
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

  protected get state(): TState {
    return this.stateEngine.currentState;
  }

  protected get cachedRGB(): TRGBTuple | null {
    return this.stateEngine.rgb;
  }

  get currentState(): TState {
    return this.stateEngine.currentState;
  }

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
    if (this.getRunningMode() === 'IMAGE') this.onStateUpdated();
  }

  // See FaceLandmarkerEngineBase.redraw.
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

      this.handLandmarker = await getSharedHandLandmarker(
        this.canvas1,
        this.getRunningMode(),
        this.options.assets,
        signal,
      );
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      if (signal.aborted || !this.ensureAlive(token)) return;

      this.updateState.setTryOnStarted(true);
      await this.onTryOnReady();
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      console.error('startTryOn failed', err);

      // Same "don't call cleanup()" reasoning as `FaceLandmarkerEngineBase`/`HairSegmenterEngineBase` -
      // this engine is still mounted and still subscribed-to by the React wrapper.
      this.handLandmarker = null;
      this.updateState.setError(TRYON_LOAD_ERROR);
    }
  }

  /* ================= RENDER ================= */

  public renderFrame(drawSource: HTMLVideoElement | HTMLImageElement) {
    const ctx = this.canvas2.getContext('2d');
    if (!ctx) return;

    resizeElements(drawSource, this.canvas1, this.canvas2);

    const width = this.canvas2.width;
    const height = this.canvas2.height;

    ctx.clearRect(0, 0, width, height);

    this.updateState.setDetectionStatus(
      getHandDetectionStatus(this.hands, this.worldHands, this.handedness),
    );

    ctx.save();

    // ===== MIRROR (LIVE MODE ONLY) =====
    if (this.isMirrored) {
      ctx.translate(width, 0);
      ctx.scale(-1, 1);
    }

    // Always draw the base frame, even with nothing selected yet.
    ctx.drawImage(drawSource, 0, 0, width, height);

    if (this.hands.length === 0 || !this.state.color || !this.cachedRGB) {
      ctx.restore();
      return;
    }

    const dimension = { width, height };
    const rgb = this.cachedRGB;
    const hands = this.hands;
    const worldHands = this.worldHands;
    const handedness = this.handedness;
    const applyNailEffect = () => {
      this.applyEffect({
        hands,
        worldHands,
        handedness,
        ctx,
        dimension,
        rgb,
        state: this.state,
        assets: this.assets,
      });
    };

    renderCompareSlider(ctx, width, height, this.comparePosition, this.isMirrored, applyNailEffect);
  }

  /* ================= SNAPSHOT ================= */

  public takeSnapshotInternal(source: HTMLVideoElement | HTMLImageElement) {
    return captureSnapShot(source, this.canvas2);
  }

  /* ================= DETECTION (shared by withLiveCamera/withImageUpload) ================= */

  // Same four-method surface `FaceLandmarkerEngineBase`/`HairSegmenterEngineBase` each implement -
  // see `FaceLandmarkerEngineBase.hasDetector`'s own comment for why. `HandLandmarker`'s
  // `detect`/`detectForVideo` are synchronous just like `FaceLandmarker`'s, so `isStillValid`
  // goes unused here the same way it does in `FaceLandmarkerEngineBase`'s own implementation.
  public hasDetector(): boolean {
    return !!this.handLandmarker;
  }

  public detectFrameForLive(
    video: HTMLVideoElement,
    _isStillValid: () => boolean,
    onDetected: () => void,
  ): void {
    if (!this.handLandmarker) return;
    const result = this.handLandmarker.detectForVideo(video, performance.now());
    this.hands = result.landmarks;
    this.worldHands = result.worldLandmarks;
    this.handedness = result.handedness;
    onDetected();
  }

  public detectFrameForUpload(image: HTMLImageElement): void {
    if (!this.handLandmarker) return;
    const result = this.handLandmarker.detect(image);
    this.hands = result.landmarks;
    this.worldHands = result.worldLandmarks;
    this.handedness = result.handedness;
  }

  public resetDetectionResult(): void {
    this.hands = [];
    this.worldHands = [];
    this.handedness = [];
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
    // Deliberately NOT closing `this.handLandmarker` - it's a shared instance from
    // `HandLandmarkerCache`, reused by later mounts (same reasoning as
    // `FaceLandmarkerEngineBase.cleanup`/`HairSegmenterEngineBase.cleanup` not closing their own
    // shared detector).
    this.handLandmarker = null;
    this.hands = [];
    this.worldHands = [];
    this.handedness = [];
    this.updateState.internalReset();
  }

  /* ================= ABSTRACT (category-specific) ================= */

  protected abstract getRunningMode(): TRunningMode;
  protected abstract onTryOnReady(): Promise<void> | void;
  protected abstract onStateUpdated(): void;
  protected abstract getInitialState(): TState;
  protected abstract loadCategoryAssets(signal: AbortSignal): Promise<TAssets | null>;
  protected abstract applyEffect(params: IApplyNailEffectParams<TState, TAssets>): void;
}
