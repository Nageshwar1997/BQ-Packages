import { TRY_ON_SUB_CATEGORY_MAP } from '@beautinique/frontend-constants';

import { HAIR_DEFAULT_RANGE } from '../../../constants/hair.js';
import type {
  IApplyHairEffectParams,
  IHairAssets,
  IHairTryOnState,
  THairFinish,
} from '../../../types/hair.js';
import {
  applyColorHair,
  applyHennaHair,
  applyHighlightsHair,
  applyOmbreHair,
} from '../../../utils/hair.js';
import { HairSegmenterEngineBase } from '../../HairSegmenterEngineBase.js';

// Finishes that don't have dedicated rendering yet - same "fall back to the most basic finish,
// with a console warning" landing-spot pattern LIP/FACE's own `UNSUPPORTED_<CATEGORY>_FINISHES`
// use. COLOR is HAIR's own "most basic" finish (a full-strand recolor, the foundation every other
// HAIR finish builds on - see docs/tryons/HAIR-PLAN.md's Subcategories section), the same role
// FOUNDATION plays for FACE. Empty now that every HAIR finish has dedicated rendering - kept
// (rather than deleted) as the landing spot for any future HAIR finish added later, same as
// FACE/LIP's own sets never got removed either.
const UNSUPPORTED_HAIR_FINISHES = new Set<THairFinish>([]);

/**
 * HAIR category engine - fresh design (no reference implementation covers hair recolor at all,
 * see docs/tryons/HAIR-PLAN.md), built on `HairSegmenterEngineBase` (this category's own parallel
 * to `FaceLandmarkerEngineBase` - see that file's comment for why) instead of the landmark-based one every
 * other category uses. Still abstract - `getRunningMode`/`onTryOnReady`/`onStateUpdated` are
 * filled in by whichever mode mixin wraps this (see HairLiveEngine.ts/HairUploadEngine.ts).
 */
export abstract class HairEngineBase extends HairSegmenterEngineBase<IHairTryOnState> {
  protected getInitialState(): IHairTryOnState {
    return {
      type: null,
      color: null,
      // No `type` yet to pick a finish-specific default from - same reasoning as
      // FaceEngineBase's identical comment.
      range: HAIR_DEFAULT_RANGE,
      cameraReady: false,
      imageReady: false,
      tryOnStarted: false,
      detectionStatus: 'not-in-frame',
    };
  }

  protected loadCategoryAssets(): Promise<IHairAssets> {
    return Promise.resolve(null);
  }

  protected applyEffect({
    mask,
    ctx,
    dimension,
    rgb,
    state,
  }: IApplyHairEffectParams<IHairTryOnState, IHairAssets>): void {
    if (!state.type) return;

    const alpha = state.range;
    const params = { mask, ctx, rgb, dimension, alpha };

    if (UNSUPPORTED_HAIR_FINISHES.has(state.type)) {
      console.warn(
        `HAIR finish "${state.type}" doesn't have dedicated rendering yet - falling back to COLOR.`,
      );
      applyColorHair(params);
      return;
    }

    switch (state.type) {
      case TRY_ON_SUB_CATEGORY_MAP.COLOR:
        applyColorHair(params);
        return;
      case TRY_ON_SUB_CATEGORY_MAP.HENNA:
        applyHennaHair(params);
        return;
      case TRY_ON_SUB_CATEGORY_MAP.OMBRE:
        applyOmbreHair(params);
        return;
      case TRY_ON_SUB_CATEGORY_MAP.HIGHLIGHTS:
        applyHighlightsHair(params);
        return;
    }
  }
}
