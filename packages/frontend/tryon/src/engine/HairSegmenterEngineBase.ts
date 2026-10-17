import type { ImageSegmenter } from '@mediapipe/tasks-vision';

import type { IApplyHairEffectParams, IHairMask } from '../types/hair.js';
import type { IEngineOptions, IMakeupState, TRGBTuple, TRunningMode } from '../types/index.js';
import { getHairDetectionStatus } from '../utils/hair.js';
import { captureSnapShot, renderCompareSlider, resizeElements } from '../utils/index.js';
import { extractHairMask, getSharedHairSegmenter } from './HairSegmenterCache.js';
import { TRYON_LOAD_ERROR, TryOnStateEngine } from './TryOnStateEngine.js';

/**
 * `FaceLandmarkerEngineBase`'s exact counterpart for segmentation-tracked categories - same state
 * pub-sub, abort-safe lifecycle, canvas sizing, compare-slider split-screen render, and snapshot
 * capture, just built on MediaPipe `ImageSegmenter` (a per-pixel confidence mask) instead of
 * `FaceLandmarker` (a landmark array). Deliberately a parallel file, not a change to
 * `FaceLandmarkerEngineBase` itself - that class's `startTryOn`/`renderFrame` call
 * `getSharedFaceLandmarker` and read `this.landmark.faceLandmarks[0]` directly (not through any
 * overridable "detector" abstraction), and `IRenderTargetParams`'s base shape carries a
 * landmark-only `face` field. HAIR is the only category needing this today - see
 * docs/tryons/HAIR-PLAN.md's "Engine architecture" section for the full reasoning, including why
 * this duplicates rather than generalizes the existing base.
 *
 * The state pub-sub/lifecycle bookkeeping (`TryOnStateEngine`) and the compare-slider draw
 * (`renderCompareSlider`) *are* shared with `FaceLandmarkerEngineBase`/`HandLandmarkerEngineBase`,
 * via composition rather than a common parent - see `TryOnStateEngine`'s own comment for why.
 *
 * `TAssets` is whatever a category needs loaded once before rendering can start - `null` for
 * every HAIR finish so far (see `IHairAssets`).
 */
export abstract class HairSegmenterEngineBase<TState extends IMakeupState, TAssets = null> {
  protected canvas1: HTMLCanvasElement;
  protected canvas2: HTMLCanvasElement;
  // What the engine was given besides its canvases and its state: where its files are.
  protected readonly options: IEngineOptions;

  protected segmenter: ImageSegmenter | null = null;
  protected mask: IHairMask | null = null;
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

      this.segmenter = await getSharedHairSegmenter(
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

      // Same "don't call cleanup()" reasoning as `FaceLandmarkerEngineBase.startTryOn` - this
      // engine is still mounted and still subscribed-to by the React wrapper.
      this.segmenter = null;
      this.updateState.setError(TRYON_LOAD_ERROR);
    }
  }

  /* ================= RENDER ================= */

  public renderFrame(drawSource: HTMLVideoElement | HTMLImageElement) {
    const ctx = this.canvas2.getContext('2d');
    if (!ctx || !this.mask) return;

    resizeElements(drawSource, this.canvas1, this.canvas2);

    const width = this.canvas2.width;
    const height = this.canvas2.height;

    ctx.clearRect(0, 0, width, height);

    this.updateState.setDetectionStatus(getHairDetectionStatus(this.mask));

    ctx.save();

    // ===== MIRROR (LIVE MODE ONLY) =====
    if (this.isMirrored) {
      ctx.translate(width, 0);
      ctx.scale(-1, 1);
    }

    // Always draw the base frame, even with nothing selected yet.
    ctx.drawImage(drawSource, 0, 0, width, height);

    if (!this.state.color || !this.cachedRGB) {
      ctx.restore();
      return;
    }

    const dimension = { width, height };
    const rgb = this.cachedRGB;
    const mask = this.mask;
    const applyHairEffect = () => {
      this.applyEffect({ mask, ctx, dimension, rgb, state: this.state, assets: this.assets });
    };

    renderCompareSlider(ctx, width, height, this.comparePosition, this.isMirrored, applyHairEffect);
  }

  /* ================= SNAPSHOT ================= */

  public takeSnapshotInternal(source: HTMLVideoElement | HTMLImageElement) {
    return captureSnapShot(source, this.canvas2);
  }

  /* ================= DETECTION (shared by withLiveCamera/withImageUpload) ================= */

  // Same four-method surface `FaceLandmarkerEngineBase`/`HandLandmarkerEngineBase` each implement -
  // see `FaceLandmarkerEngineBase.hasDetector`'s own comment for why. The one genuine difference
  // (Live uses `segmentForVideo`'s *callback* overload, Upload the synchronous `segment()`) lives
  // entirely inside these two methods now, instead of inside two near-duplicate mixin files.
  public hasDetector(): boolean {
    return !!this.segmenter;
  }

  public detectFrameForLive(
    video: HTMLVideoElement,
    isStillValid: () => boolean,
    onDetected: () => void,
  ): void {
    if (!this.segmenter) return;
    this.segmenter.segmentForVideo(video, performance.now(), (result) => {
      // The callback can fire after a stop/restart already moved past this exact loop iteration
      // (camera stopped, video swapped) - re-checking before touching `this.mask` (not after)
      // matters here specifically: a stale callback resolving post-`stopCamera()` must not
      // resurrect a non-null mask that `resetDetectionResult` already cleared.
      if (!isStillValid()) return;
      // `false`: this mask is task-owned (handed to us inside the callback), freed automatically
      // once this callback returns - see `extractHairMask`'s own comment.
      this.mask = extractHairMask(result, false);
      onDetected();
    });
  }

  public detectFrameForUpload(image: HTMLImageElement): void {
    if (!this.segmenter) return;
    // `true`: this mask is an app-owned copy from the synchronous overload, not task-owned - see
    // `extractHairMask`'s own comment on why this one needs closing.
    this.mask = extractHairMask(this.segmenter.segment(image), true);
  }

  public resetDetectionResult(): void {
    this.mask = null;
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
    // Deliberately NOT closing `this.segmenter` - it's a shared instance from
    // `HairSegmenterCache`, reused by later mounts (same reasoning as
    // `FaceLandmarkerEngineBase.cleanup` not closing `this.landmarker`).
    this.segmenter = null;
    this.mask = null;
    this.updateState.internalReset();
  }

  /* ================= ABSTRACT (category-specific) ================= */

  protected abstract getRunningMode(): TRunningMode;
  protected abstract onTryOnReady(): Promise<void> | void;
  protected abstract onStateUpdated(): void;
  protected abstract getInitialState(): TState;
  protected abstract loadCategoryAssets(signal: AbortSignal): Promise<TAssets | null>;
  protected abstract applyEffect(params: IApplyHairEffectParams<TState, TAssets>): void;
}
