import type { TTryOnSubCategory } from '@beautinique/frontend-types';
import type { Category, Landmark, NormalizedLandmark } from '@mediapipe/tasks-vision';

import type { IMakeupState, TDimension, TRGBTuple } from './index.js';

export type TNailFinish = TTryOnSubCategory<'NAIL'>;
export type INailTryOnState = IMakeupState<TNailFinish>;

// No assets needed yet - every finish built so far is pure per-nail color math, no texture/image
// asset. Follows FACE/HAIR's own "add fields here only once a finish genuinely needs one"
// precedent (see IFaceAssets/IHairAssets).
export type INailAssets = null;

// NAIL's own parallel to `IRenderTargetParams` (types/tryon-types/index.ts) - deliberately does
// NOT extend it. That shared base's `face: NormalizedLandmark[]` field is a single MediaPipe
// FaceLandmarker result (one face); NAIL tracks via `HandLandmarker`, whose own result can report
// *multiple* hands at once (`NormalizedLandmark[][]` - one 21-point array per detected hand), a
// plural shape the single-`face` base can't represent. See docs/tryons/NAIL-PLAN.md's "Engine
// architecture" section for the full reasoning (same exception `IHairRenderTargetParams` already
// made for its own, differently-shaped `mask` field).
export interface INailRenderTargetParams {
  hands: NormalizedLandmark[][];
  // Real-world-scale 3D landmarks (`HandLandmarkerResult.worldLandmarks`) for the same detected
  // hands, in the same order as `hands` above - used for orientation/presence checks
  // (`isHandFacingCamera`/`isFingerPresent`, utils/tryon-utils/nail.ts) that need genuine 3D
  // structure, not the normalized (perspective-distorted, always roughly 0-1) coordinates `hands`
  // itself carries for on-screen drawing.
  worldHands: Landmark[][];
  // `HandLandmarkerResult.handedness` for the same detected hands, same order as `hands` above -
  // a real hand's own chirality (mirror-image structure) flips the sign of the
  // `isHandFacingCamera` cross-product between a Left and a Right hand showing the exact same
  // physical "back facing camera" pose (confirmed against real detected data, not assumed - see
  // `NAIL_ORIENTATION_SIGN`'s own comment, constants/tryon-constants/nail.ts), so the orientation
  // check needs to know which hand it's looking at, not just its landmarks.
  handedness: Category[][];
  ctx: CanvasRenderingContext2D;
  dimension: TDimension;
}

// NAIL's own parallel to `IRenderEffectBaseParams`.
export interface INailRenderEffectBaseParams extends INailRenderTargetParams {
  alpha: number;
}

// What every NAIL render function (`apply<Finish>Nail` in utils/tryon-utils/nail.ts) takes - same
// "raw `rgb`, not a pre-built color string" reasoning as `IFaceRenderParams`/`IHairRenderParams`
// (some finishes may need their own per-channel color math before painting, same as
// DIPPOWDER's planned desaturate-toward-gray).
export interface INailRenderParams extends INailRenderEffectBaseParams {
  rgb: TRGBTuple;
}

// NAIL's own parallel to `IApplyEffectParams<TState, TAssets>`/`IApplyHairEffectParams` - same
// "one level up from the render-function boundary, also carries the engine's own
// `rgb`/`state`/`assets`" shape, just built on `INailRenderTargetParams` instead of the
// landmark-shaped or mask-shaped bases the other categories use.
export interface IApplyNailEffectParams<TState, TAssets> extends INailRenderTargetParams {
  rgb: TRGBTuple;
  state: TState;
  assets: TAssets | null;
}
