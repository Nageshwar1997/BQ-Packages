import { TRY_ON_SUB_CATEGORY_MAP } from '@beautinique/frontend-constants';

import { NAIL_DEFAULT_RANGE } from '../../../constants/nail.js';
import type {
  IApplyNailEffectParams,
  INailAssets,
  INailTryOnState,
  TNailFinish,
} from '../../../types/nail.js';
import {
  applyChromeNail,
  applyDipPowderNail,
  applyGelNail,
  applyGlitterNail,
  applyLiquidNail,
} from '../../../utils/nail.js';
import { HandLandmarkerEngineBase } from '../../HandLandmarkerEngineBase.js';

// Finishes that don't have dedicated rendering yet - same "fall back to the most basic finish,
// with a console warning" landing-spot pattern LIP/FACE/HAIR's own `UNSUPPORTED_<CATEGORY>_FINISHES`
// use. LIQUID is NAIL's own "most basic" finish (a flat full-nail color fill, the foundation every
// other NAIL finish builds on - see docs/tryons/NAIL-PLAN.md's Subcategories section), the same
// role FOUNDATION/COLOR play for FACE/HAIR. Empty now - all 5 NAIL finishes have dedicated
// rendering (same "left empty, not removed" precedent HAIR's own `UNSUPPORTED_HAIR_FINISHES` set
// once every HAIR finish was built).
const UNSUPPORTED_NAIL_FINISHES = new Set<TNailFinish>([]);

/**
 * NAIL category engine - fresh design (no reference implementation covers nail try-on at all, see
 * docs/tryons/NAIL-PLAN.md), built on `HandLandmarkerEngineBase` (this category's own parallel to
 * `FaceLandmarkerEngineBase` - see that file's comment for why) instead of the face-landmark or
 * segmentation bases every other category uses. Still abstract - `getRunningMode`/`onTryOnReady`/
 * `onStateUpdated` are filled in by whichever mode mixin wraps this (see
 * NailLiveEngine.ts/NailUploadEngine.ts).
 */
export abstract class NailEngineBase extends HandLandmarkerEngineBase<INailTryOnState> {
  protected getInitialState(): INailTryOnState {
    return {
      type: null,
      color: null,
      // No `type` yet to pick a finish-specific default from - same reasoning as
      // FaceEngineBase/HairEngineBase's identical comment.
      range: NAIL_DEFAULT_RANGE,
      cameraReady: false,
      imageReady: false,
      tryOnStarted: false,
      detectionStatus: 'not-in-frame',
    };
  }

  protected loadCategoryAssets(): Promise<INailAssets> {
    return Promise.resolve(null);
  }

  protected applyEffect({
    hands,
    worldHands,
    handedness,
    ctx,
    dimension,
    rgb,
    state,
  }: IApplyNailEffectParams<INailTryOnState, INailAssets>): void {
    if (!state.type) return;

    const alpha = state.range;
    const params = { hands, worldHands, handedness, ctx, rgb, dimension, alpha };

    if (UNSUPPORTED_NAIL_FINISHES.has(state.type)) {
      console.warn(
        `NAIL finish "${state.type}" doesn't have dedicated rendering yet - falling back to LIQUID.`,
      );
      applyLiquidNail(params);
      return;
    }

    switch (state.type) {
      case TRY_ON_SUB_CATEGORY_MAP.LIQUID:
        applyLiquidNail(params);
        return;
      case TRY_ON_SUB_CATEGORY_MAP.GEL:
        applyGelNail(params);
        return;
      case TRY_ON_SUB_CATEGORY_MAP.DIPPOWDER:
        applyDipPowderNail(params);
        return;
      case TRY_ON_SUB_CATEGORY_MAP.GLITTER:
        applyGlitterNail(params);
        return;
      case TRY_ON_SUB_CATEGORY_MAP.CHROME:
        applyChromeNail(params);
        return;
    }
  }
}
