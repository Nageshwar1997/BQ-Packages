import type { TTryOnSubCategory } from '@beautinique/frontend-types';

import type { IMakeupState, IRenderEffectBaseParams, TRGBTuple } from './index.js';

export type TEyeFinish = TTryOnSubCategory<'EYE'>;

// EYE is the first category with a second customizable dimension beyond color - `pattern` (see
// docs/tryons/EYE-PLAN.md, the planning doc written before any of this existed). LIP/FACE never
// needed this (`IMakeupState` itself has no `pattern` field), so it's added here as an
// EYE-specific extension rather than touching the shared base - `null` until the shopper picks
// one, same "blank until chosen" shape `color`/`type` already use. The actual set of valid ids
// differs per finish (EYELINER's 7 aren't KAJAL's 4) - see `EYELINER_PATTERNS` in
// constants/tryon-constants/eye.ts - so this stays a plain `string` rather than one shared union.
export interface IEyeTryOnState extends IMakeupState<TEyeFinish> {
  pattern: string | null;
}

// No textures yet - every EYE finish built so far is pure canvas path/gradient math, no asset
// needed. Follows LIP/FACE's own precedent (see `ILipAssets`/`IFaceAssets`) - add fields here
// only once a finish genuinely needs one (LASHES is the likely first candidate per EYE-PLAN.md).
export type IEyeAssets = null;

// What every EYE render function (`apply<Finish>Eye` in utils/tryon-utils/eye.ts) takes - `rgb`
// (raw tuple, same reasoning as FACE's `IFaceRenderParams`) plus `pattern`, the chosen style's
// id. Kept as a plain `string` here (not a specific pattern union) since different EYE finishes
// have entirely different pattern sets - each render function narrows/switches on its own
// finish-specific union internally instead.
export interface IEyeRenderParams extends IRenderEffectBaseParams {
  rgb: TRGBTuple;
  pattern: string;
}

// One selectable pattern/style - `id` is what `state.pattern` holds and what render functions
// switch on, `label` is shopper-facing copy, `image` is the preview thumbnail shown in the
// pattern picker, as a path inside the assets package (images/eye/<finish>/..., made an address by
// `resolveTryOnAssetUrl`; see EYE-PLAN.md's own build note on which finishes reuse which asset
// style).
export interface IEyePatternOption {
  id: string;
  label: string;
  image: string;
}
