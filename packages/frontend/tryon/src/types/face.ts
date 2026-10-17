import type { TTryOnSubCategory } from '@beautinique/frontend-types';

import type { IMakeupState, IRenderEffectBaseParams, TRGBTuple } from './index.js';

export type TFaceFinish = TTryOnSubCategory<'FACE'>;
export type IFaceTryOnState = IMakeupState<TFaceFinish>;

// No textures yet - every finish built so far is a pure color/blend effect, no asset needed.
// Follows LIP's own precedent (MATTE/STAIN/LINER need none either) - add fields here only once
// a finish genuinely needs one, same as `ILipAssets` grew incrementally.
export type IFaceAssets = null;

// What every FACE render function (`apply<Finish>Face` in utils/tryon-utils/face.ts) takes -
// `rgb` (the raw tuple), not a pre-built color string, because several finishes need to do their
// own per-channel color math first (`mixTowardWhite`/`mixTowardBlack`/`applyWarmShift`/
// `desaturateTowardGray`) before they can paint - unlike LIP, where every finish only ever
// consumes the shade as a flat string (see `ILipRenderParams`, types/tryon-types/lip.ts). All 8
// FACE finishes share this exact shape, including FOUNDATION - it used to be the one exception
// (took a pre-built `color: string` while every other finish took `rgb`), unified here since
// there was no real reason for it to differ.
export interface IFaceRenderParams extends IRenderEffectBaseParams {
  rgb: TRGBTuple;
}
