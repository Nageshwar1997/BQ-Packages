import type { TRY_ON_CATEGORY_MAP } from '@beautinique/frontend-constants';
import type { TTryOnSubCategory } from '@beautinique/frontend-types';

import type { IMakeupState, TDimension, TRGBTuple } from './index.js';

export type THairFinish = TTryOnSubCategory<typeof TRY_ON_CATEGORY_MAP.HAIR>;
export type IHairTryOnState = IMakeupState<THairFinish>;

// No assets needed yet - COLOR (the only finish with dedicated rendering so far, see
// HairEngineBase.ts) is pure per-pixel color math on the segmentation mask, no texture/image
// asset. Follows FACE/LIP's own "add fields here only once a finish genuinely needs one"
// precedent (see IFaceAssets).
export type IHairAssets = null;

// A processed hair-confidence mask, read once per frame off the `ImageSegmenter`'s own
// `ImageSegmenterResult.confidenceMasks[1]` (background=0, hair=1 - see HairSegmenterCache.ts)
// via `MPMask.getAsFloat32Array()`. Deliberately a plain data shape (a flat per-pixel confidence
// array plus its own width/height - the segmenter's own output resolution, not necessarily the
// render canvas's `dimension`), not the raw `MPMask`/`ImageSegmenterResult` - every HAIR render
// function only ever depends on this app's own type this way, not `@mediapipe/tasks-vision`'s,
// same reasoning `TPoint` (types/tryon-types/index.ts) already applies to landmark points.
export interface IHairMask {
  data: Float32Array;
  width: number;
  height: number;
}

// HAIR's own parallel to `IRenderTargetParams` (types/tryon-types/index.ts) - deliberately does
// NOT extend it. That shared base's `face: NormalizedLandmark[]` field is a MediaPipe
// FaceLandmarker landmark array; HAIR tracks via pixel segmentation, not face landmarks, so it has
// no `face` to give at all - forcing this to extend the landmark-shaped base would mean either a
// fake/empty `face` field or a lie about what this category actually tracks. See
// docs/tryons/HAIR-PLAN.md's "Engine architecture" section for the full reasoning (also saved as
// a standing note in this session's memory, so this exception doesn't get "fixed" by mistake
// later).
export interface IHairRenderTargetParams {
  mask: IHairMask;
  ctx: CanvasRenderingContext2D;
  dimension: TDimension;
}

// HAIR's own parallel to `IRenderEffectBaseParams`.
export interface IHairRenderEffectBaseParams extends IHairRenderTargetParams {
  alpha: number;
}

// What every HAIR render function (`apply<Finish>Hair` in utils/tryon-utils/hair.ts) takes - same
// "raw `rgb`, not a pre-built color string" reasoning as `IFaceRenderParams` (some finishes may
// need their own per-channel color math before painting, same as FACE's mix/desaturate helpers).
export interface IHairRenderParams extends IHairRenderEffectBaseParams {
  rgb: TRGBTuple;
}

// HAIR's own parallel to `IApplyEffectParams<TState, TAssets>` - same "one level up from the
// render-function boundary, also carries the engine's own `rgb`/`state`/`assets`" shape, just
// built on `IHairRenderTargetParams` instead of the landmark-shaped `IRenderTargetParams`.
export interface IApplyHairEffectParams<TState, TAssets> extends IHairRenderTargetParams {
  rgb: TRGBTuple;
  state: TState;
  assets: TAssets | null;
}
