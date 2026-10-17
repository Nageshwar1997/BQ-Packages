// Generic types for the class-based Try-On rendering engine (canvas + MediaPipe
// FaceLandmarker) in `@/classes/tryon`. Shared by every category's engine
// (LipEngineBase today, EyeEngineBase/FaceEngineBase/... later). Product-taxonomy types
// (TRY_ON_MAP category/subCategory) live in `@beautinique/frontend-types` instead - not here.

import type { FaceDetectorOptions, Landmark, NormalizedLandmark } from '@mediapipe/tasks-vision';

import type { TRYON_MODES } from '../constants/index.js';
import type { ITryOnAssets } from './assets.js';

// What an engine is given besides its canvases and its initial state: where its files (the models
// and the textures) are. Not state - it does not change during the life of an engine.
export interface IEngineOptions {
  assets?: ITryOnAssets;
}

export type TRunningMode = FaceDetectorOptions['runningMode'];

export type TRGBTuple = [r: number, g: number, b: number];

export type TRGBATuple = [r: number, g: number, b: number, a: number];

export type TDimension = Record<'width' | 'height', number>;

export type TPoint = Pick<Landmark, 'x' | 'y'>;

export type TTryOnMode = (typeof TRYON_MODES)[number];

export interface ITryOnInstruction {
  icon: string;
  text: string;
}

// The 3 fields every shape in this render-param hierarchy needs, no matter which "level" it's
// at - the landmark mesh to read from, the 2D context to paint into, and the canvas's own pixel
// dimensions (landmark coords are 0-1 normalized, so every level needs this to convert to actual
// pixels). Both `IRenderEffectBaseParams` and `IApplyEffectParams` below extend this rather than
// each repeating the same 3 fields.
export interface IRenderTargetParams {
  face: NormalizedLandmark[];
  ctx: CanvasRenderingContext2D;
  dimension: TDimension;
}

// Shared param-object shape every category's per-finish render function takes, regardless of
// category - previously these were 4-5 positional args (`face, ctx, dimension, alpha` plus
// whatever the category adds), repeated identically across every one of LIP's 11 and FACE's 8
// render functions. Object params make the call site self-documenting (`applyBlushFace({ face,
// ctx, rgb, dimension, alpha })` vs remembering positional order) and let a category extend this
// with just its own additional field(s) - see `IFaceRenderParams` (types/tryon-types/face.ts) and
// `ILipRenderParams`/`ILipSingleTextureRenderParams`/`ILipDoubleTextureRenderParams`
// (types/tryon-types/lip.ts). Purely the render-function boundary - `FaceLandmarkerEngineBase.applyEffect`
// itself (one level up, also carries engine-only concerns like `state`/`assets`) has its own
// wider shape, `IApplyEffectParams` below. Internal, single-file-only helpers (e.g.
// `drawFeatheredBlob`/`fillFaceOvalRegion` in utils/tryon-utils/face.ts) deliberately stay
// positional - they're never called across a file boundary, so there's no "consumer" for an
// object param to clarify anything for.
export interface IRenderEffectBaseParams extends IRenderTargetParams {
  alpha: number;
}

// `FaceLandmarkerEngineBase.applyEffect`'s own abstract-method shape - one level above
// `IRenderEffectBaseParams` (both share `IRenderTargetParams`, but this one branches off with its
// own extra fields rather than also extending `IRenderEffectBaseParams` - `alpha` isn't one of
// them, `state.range` is the actual intensity value at this level, `alpha` only gets derived from
// it inside each category's own `applyEffect` override). Still category-agnostic (generic over
// `TState`/`TAssets`, mirroring the class itself), but carries the engine's own raw `rgb` (every
// category receives the same `TRGBTuple` here; what each category's *render functions* actually
// want - raw `rgb` for FACE, a pre-built `color` string for LIP - is each category's own
// `applyEffect` override's job to adapt, not this shared boundary's).
export interface IApplyEffectParams<TState, TAssets> extends IRenderTargetParams {
  rgb: TRGBTuple;
  state: TState;
  assets: TAssets | null;
}

// Recomputed every `renderFrame` call (see `FaceLandmarkerEngineBase`/`HairSegmenterEngineBase`/
// `HandLandmarkerEngineBase`) from that frame's own detection, not a one-time setup flag like
// `cameraReady`/`imageReady` below - it can flip back and forth as the user moves in and out of
// frame while Live mode keeps running. What's actually being detected depends on the category:
// LIP/FACE/EYE track a real face, HAIR tracks a hair-confidence mask (`getHairDetectionStatus`),
// NAIL tracks a hand (`getHandDetectionStatus`) - the status values below are phrased generically
// so every category's own detection function can report them meaningfully.
// 'not-in-frame': nothing detected at all, or it's partially cut off by the frame edge.
// 'not-clear': something is detected and fully inside the frame, but too small to trust (too far
// from the camera, or - by the same "too little is confidently visible" reasoning - too
// obscured/blurry in practice). Only ever produced by FACE today (see `isFaceTurnedTooMuch`'s
// neighboring checks in utils/tryon-utils/face.ts) - HAIR/NAIL have no equivalent "too small to
// trust" concept.
// 'turned': something is detected, in frame, and large enough, but oriented wrong - only ever
// produced by categories whose rendering genuinely needs a specific pose (see
// `FaceLandmarkerEngineBase.refineDetectionStatus`/`FaceEngineBase`'s override for FACE's "head turned too
// far to one side", and `getHandDetectionStatus`, utils/tryon-utils/nail.ts, for NAIL's "hand not
// facing the camera nail-side-up"); a category that never produces this value can never report it.
// 'detected': good enough to try makeup on.
export type TDetectionStatus = 'detected' | 'not-in-frame' | 'not-clear' | 'turned';

// What the not-ready overlay shows when setup fails (camera, photo, model load): a short heading and
// the sentence under it. Always both - so an error can never reach the screen without a heading.
export interface ITryOnError {
  title: string;
  description: string;
}

export interface IMakeupBaseState {
  cameraReady: boolean;
  imageReady: boolean;
  tryOnStarted: boolean;
  // Absent while there's nothing wrong.
  error?: ITryOnError;
  detectionStatus: TDetectionStatus;
}

// `TType` is a category's finish/variant union (e.g. a LIP subcategory like
// 'MATTE' | 'GLOSS' | ...) - `null` means "no finish picked yet".
export interface IMakeupState<TType extends string = string> extends IMakeupBaseState {
  type: TType | null;
  color: string | null;
  range: number;
}

// Imperative API every category's engine (Live or Upload) exposes up to its React wrapper
// component, generic over that category's state shape. Deliberately a plain interface (not a
// reference to the `FaceLandmarkerEngineBase` class type) - the engine mixins (`withLiveCamera`/
// `withImageUpload`) cast their return type to these, and casting to a *class* type would
// drag its abstract-member bookkeeping along, defeating the cast. See those files' comments.
export interface ITryOnEngineBaseRef<TState> {
  setMakeupState: (state: Partial<TState>) => void;
  getState: () => TState;
  takeSnapshot: () => string | null;
  resetState: () => void;
  onSourceChange: () => void;
  setComparePosition: (value: number | null) => void;
  getCanvas: () => HTMLCanvasElement;
  onChange: (listener: (state: TState) => void) => () => void;
  startTryOn: () => Promise<void>;
  destroy: () => void;
}

export interface ITryOnLiveEngineRef<TState> extends ITryOnEngineBaseRef<TState> {
  attachVideo: (video: HTMLVideoElement) => void;
  startCamera: () => Promise<void>;
  stopCamera: () => void;
  restartCamera: () => Promise<void>;
  getStream: () => MediaStream | null;
}

export interface ITryOnUploadEngineRef<TState> extends ITryOnEngineBaseRef<TState> {
  loadImageUrl: (url: string) => Promise<void>;
  // Repaints the current photo without any state change - the stage calls it when the canvas's
  // box resizes (window resize/rotate), since Upload mode has no render loop to re-fit it.
  redraw: () => void;
}

// Minimal imperative surface a category's `<Category>TryOnStage` exposes to the orchestrating
// modal (e.g. `TryOnModal`) - just enough to drive shade selection, snapshotting, and the
// before/after compare split, whichever of Live/Upload is currently mounted underneath. Mirrors
// the reference implementation's `ITryOnCommonRef`, trimmed to what this app actually uses (no
// reset yet).
export interface ITryOnStageRef<TState> {
  setMakeupState: (state: Partial<TState>) => void;
  getState: () => TState | undefined;
  takeSnapshot: () => string | null;
  // Only meaningful in Live mode - `null` otherwise (Upload mode has no camera stream). Used to
  // feed the same stream into the sidebar's small blurred preview.
  getStream: () => MediaStream | null;
  // `null` clears the split (normal render); a 0-1 fraction shows "before" left of that x
  // position and "after" (the makeup-composited render) right of it. See `FaceLandmarkerEngineBase`'s
  // `renderFrame` for the actual split/divider draw.
  setComparePosition: (value: number | null) => void;
  // The canvas actually being drawn to - lets a UI-side compare-slider account for its CSS
  // `object-fit` (contain/cover) sizing, so the draggable divider lines up with the one
  // `renderFrame` itself draws instead of assuming the canvas fills its box edge-to-edge.
  getCanvas: () => HTMLCanvasElement | null;
}

// A product's shade/color variant - real data (`product.variants`, `type === 'Color'`), not
// user-invented via a color picker. See `ProductDetails/index.tsx`'s `shades` memo.
export interface IShade {
  name: string;
  hexColor: string;
}

// How much of a canvas's own box its actual rendered content occupies, horizontally, once CSS
// `object-fit` has scaled it (see `getObjectFitContentRect` in utils/tryon-utils/index.ts) -
// lets UI drawn *over* the canvas (the compare-slider divider, see `TryOnCompareSlider.tsx`)
// line up with the actual rendered frame instead of the box's raw edges.
export interface IObjectFitContentRect {
  leftPercent: number;
  widthPercent: number;
}

export interface IRangeBounds {
  min: number;
  max: number;
  default: number;
}

// The small structural surface `withLiveCamera.ts`/`withImageUpload.ts` need from *any* tracking-
// model engine base - `FaceLandmarkerEngineBase`/`HairSegmenterEngineBase`/`HandLandmarkerEngineBase`
// each implement every member here identically-shaped (only the bodies differ, over their own
// detector/result fields - see `FaceLandmarkerEngineBase.hasDetector`'s own comment). A plain
// interface rather than a reference to any one of those three classes - that's exactly what lets
// one shared pair of mixin files attach Live/Upload behavior to any of them, instead of needing a
// copy of each mixin per tracking model the way this file's own git history once had. Not generic
// over `TState` - nothing below actually needs to know its shape, only `IMakeupState`'s own
// `cameraReady`/`imageReady`/`error` fields via the plain `updateState` setters already typed here.
export interface IDetectableEngine {
  setMirror(value: boolean): void;
  ensureAlive(token?: number): boolean;
  renderFrame(source: HTMLVideoElement | HTMLImageElement): void;
  takeSnapshotInternal(source: HTMLVideoElement | HTMLImageElement): string | null;
  // Public (not `protected`, unlike the real engine bases' own declaration) purely so this plain
  // interface can express it at all - interfaces can't carry access modifiers, and
  // `withLiveCamera`/`withImageUpload`'s own `override cleanup()` needs to call `super.cleanup()`.
  // Never part of `ITryOnEngineBaseRef`/called externally either way.
  cleanup(): void;

  updateState: {
    setError: (error: ITryOnError | undefined) => void;
    setCameraReady: (value: boolean) => void;
    setImageReady: (value: boolean) => void;
  };

  // Whether a detector instance has finished loading yet - `startTryOn` may still be waiting on
  // `getSharedFaceLandmarker`/etc. when Live's RAF loop or Upload's `onTryOnReady` first fires.
  hasDetector(): boolean;

  // Runs one frame's detection for Live mode and writes the result to whichever field(s) this
  // engine's own category tracks, then calls `onDetected` - synchronously for
  // `FaceLandmarkerEngineBase`/`HandLandmarkerEngineBase` (nothing to re-check in between), or
  // from inside `segmentForVideo`'s own callback for `HairSegmenterEngineBase`. `isStillValid` is
  // re-checked *before* writing the result (not just before `onDetected`) specifically for that
  // async case - see `HairSegmenterEngineBase.detectFrameForLive`'s own comment on why a stale
  // callback resolving after a stop/restart must not resurrect a cleared result.
  detectFrameForLive(
    video: HTMLVideoElement,
    isStillValid: () => boolean,
    onDetected: () => void,
  ): void;

  // Upload's equivalent - always synchronous (even `HairSegmenterEngineBase`'s own implementation
  // uses `ImageSegmenter`'s sync `segment()` overload here, not the callback one - see that
  // method's own comment on why the per-call mask-copy cost the callback overload avoids doesn't
  // matter for a photo detected once, not once per rendered frame).
  detectFrameForUpload(image: HTMLImageElement): void;

  // Clears whatever result field(s) `detectFrameForLive`/`detectFrameForUpload` write to, without
  // touching the detector instance itself (that's `cleanup()`'s own job, via the shared
  // `TryOnStateEngine`) - called from Live's `stopCamera`.
  resetDetectionResult(): void;
}
