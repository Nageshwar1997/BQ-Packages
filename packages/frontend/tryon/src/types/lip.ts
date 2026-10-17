import type { TTryOnSubCategory } from '@beautinique/frontend-types';

import type { IMakeupState, IRenderEffectBaseParams } from './index.js';

export type TLipFinish = TTryOnSubCategory<'LIP'>;
export type ILipTryOnState = IMakeupState<TLipFinish>;

// What every LIP render function (`apply<Finish>Lips` in utils/tryon-utils/lip.ts) takes at
// minimum - a pre-built `color` string (not a raw `rgb` tuple, unlike FACE - see
// `IFaceRenderParams`'s own comment on why the two categories differ here) since no LIP finish
// ever needs to do its own per-channel color math the way several FACE finishes do; the one place
// LIP re-derives RGB from this string internally (`isBrightColor` in utils/tryon-utils/lip.ts,
// deep inside the private `drawLipHalfTextured` helper) is module-internal, not part of this
// public shape. MATTE/STAIN/LINER need nothing beyond this base shape - the texture-consuming
// finishes below extend it further.
export interface ILipRenderParams extends IRenderEffectBaseParams {
  color: string;
}

// CRAYON/SHIMMER - a single texture image shared across both lip halves.
export interface ILipSingleTextureRenderParams extends ILipRenderParams {
  texture: HTMLImageElement;
}

// GLOSS/METALLIC/SATIN/BALM/PLUMPER/OIL - separate upper/lower-lip texture images.
export interface ILipDoubleTextureRenderParams extends ILipRenderParams {
  textureUpper: HTMLImageElement;
  textureLower: HTMLImageElement;
}

export interface ILipAssets {
  glossUpper: HTMLImageElement;
  glossLower: HTMLImageElement;
  crayon: HTMLImageElement;
  shimmer: HTMLImageElement;
  oilUpper: HTMLImageElement;
  oilLower: HTMLImageElement;
  metallicUpper: HTMLImageElement;
  metallicLower: HTMLImageElement;
  plumperUpper: HTMLImageElement;
  plumperLower: HTMLImageElement;
  satinUpper: HTMLImageElement;
  satinLower: HTMLImageElement;
  balmUpper: HTMLImageElement;
  balmLower: HTMLImageElement;
}
