import { TRY_ON_SUB_CATEGORY_MAP } from '@beautinique/frontend-constants';
import type { NormalizedLandmark } from '@mediapipe/tasks-vision';

import {
  EYE_DEFAULT_PATTERNS,
  EYE_DEFAULT_RANGE,
  EYELINER_DEFAULT_PATTERN,
} from '../../../constants/eye.js';
import type { IEyeAssets, IEyeTryOnState, TEyeFinish } from '../../../types/eye.js';
import type { IApplyEffectParams } from '../../../types/index.js';
import {
  applyBrowgelEye,
  applyEyebrowEye,
  applyEyelinerEye,
  applyEyeshadowEye,
  applyKajalEye,
  applyLashesEye,
  applyMascaraEye,
  isEyeTurnedTooMuch,
} from '../../../utils/eye.js';
import { FaceLandmarkerEngineBase } from '../../FaceLandmarkerEngineBase.js';

// Finishes that don't have dedicated rendering yet - see docs/tryons/EYE-PLAN.md's build order.
// Unlike LIP's `UNSUPPORTED_LIP_FINISHES`/FACE's `UNSUPPORTED_FACE_FINISHES` (which fall back to
// rendering as that category's most basic finish, MATTE/FOUNDATION), EYE's subcategories are
// different *product types* applied to different regions (a brow fill and a lash-line liner
// aren't variants of the same effect the way two lipstick finishes are) - falling back to one
// finish's rendering for another unsupported pick would paint the wrong region entirely, so this
// skips rendering (with a console warning) instead. Empty now that every planned EYE finish (see
// EYE-PLAN.md) has dedicated rendering - kept rather than removed so a future EYE addition has an
// obvious place to register itself as still-unsupported while it's being built.
const UNSUPPORTED_EYE_FINISHES = new Set<TEyeFinish>([]);

/**
 * EYE category engine - fresh design (not ported from any reference implementation, see
 * docs/tryons/EYE-PLAN.md), built on the exact same shared machinery LIP/FACE already proved out
 * (`FaceLandmarkerEngineBase`/`withLiveCamera`/`withImageUpload`). Still abstract -
 * `getRunningMode`/`onTryOnReady`/`onStateUpdated` are filled in by whichever mode mixin wraps
 * this (see EyeLiveEngine.ts/EyeUploadEngine.ts).
 */
export abstract class EyeEngineBase extends FaceLandmarkerEngineBase<IEyeTryOnState> {
  protected getInitialState(): IEyeTryOnState {
    return {
      type: null,
      color: null,
      // No `type` yet to pick a finish-specific default from - same reasoning as
      // LipEngineBase/FaceEngineBase's identical comment. Uses the category-wide
      // `EYE_DEFAULT_RANGE` rather than borrowing any one finish's own default.
      range: EYE_DEFAULT_RANGE,
      // Same "blank until picked" reasoning as `color`/`type` - no `type` yet to look up a real
      // per-finish default from (`EYE_DEFAULT_PATTERNS`, used once `type` is actually known - see
      // `applyEffect` below), so this just needs *some* starting value rather than the correct
      // one; any pattern-bearing finish's own id would do equally well as a placeholder here.
      pattern: EYELINER_DEFAULT_PATTERN,
      cameraReady: false,
      imageReady: false,
      tryOnStarted: false,
      detectionStatus: 'not-in-frame',
    };
  }

  protected loadCategoryAssets(): Promise<IEyeAssets> {
    return Promise.resolve(null);
  }

  // Same override as `FaceEngineBase`'s own (see its comment) - EYE tracks the same face mesh, and
  // every finish here traces paths right up against the lash line/eyebrow ring, at least as
  // sensitive to a turned head foreshortening those landmarks as FACE's full-face fills are.
  // Added in a later robustness pass, after every EYE finish already existed (see
  // `isEyeTurnedTooMuch`'s own comment) - EYE didn't have this at first.
  protected refineDetectionStatus(
    status: IEyeTryOnState['detectionStatus'],
    face: NormalizedLandmark[] | undefined,
  ): IEyeTryOnState['detectionStatus'] {
    if (status !== 'detected' || !face) return status;
    return isEyeTurnedTooMuch(face) ? 'turned' : status;
  }

  protected applyEffect({
    face,
    ctx,
    dimension,
    rgb,
    state,
  }: IApplyEffectParams<IEyeTryOnState, IEyeAssets>): void {
    if (!state.type) return;
    // Same reasoning as `FaceEngineBase.applyEffect`'s identical guard - a turned head can
    // foreshorten the eye/eyebrow landmarks into a genuinely wrong shape, and the overlay's own
    // semi-transparent scrim would let a bad render still show dimly through the "face the
    // camera" message without this.
    if (state.detectionStatus === 'turned') return;

    if (UNSUPPORTED_EYE_FINISHES.has(state.type)) {
      console.warn(`EYE finish "${state.type}" doesn't have dedicated rendering yet.`);
      return;
    }

    const alpha = state.range;
    // Finish-aware default, not a flat `?? EYELINER_DEFAULT_PATTERN` - each pattern-bearing
    // finish's own ids are a separate namespace (see `EYE_DEFAULT_PATTERNS`'s own comment), so a
    // fixed fallback would hand one finish another's id it can't look anything up with.
    // `EYE_DEFAULT_PATTERNS` has no entry for BROWGEL at all (it has no pattern picker - see
    // `BROWGEL_TUNING`'s own comment) - `pattern` ends up `''` or a stale leftover value for it,
    // which is harmless since `applyBrowgelEye` never reads this field. The final `?? ''` only
    // exists to satisfy `pattern: string`; it isn't asserting the lookup always succeeds, and if
    // it didn't, the tuning lookup inside whichever pattern-bearing finish's own entry point would
    // just safely render nothing.
    const pattern = state.pattern ?? EYE_DEFAULT_PATTERNS[state.type] ?? '';

    switch (state.type) {
      case TRY_ON_SUB_CATEGORY_MAP.EYELINER:
        applyEyelinerEye({ face, ctx, rgb, dimension, alpha, pattern });
        return;
      case TRY_ON_SUB_CATEGORY_MAP.KAJAL:
        applyKajalEye({ face, ctx, rgb, dimension, alpha, pattern });
        return;
      case TRY_ON_SUB_CATEGORY_MAP.EYESHADOW:
        applyEyeshadowEye({ face, ctx, rgb, dimension, alpha, pattern });
        return;
      case TRY_ON_SUB_CATEGORY_MAP.EYEBROW:
        applyEyebrowEye({ face, ctx, rgb, dimension, alpha, pattern });
        return;
      case TRY_ON_SUB_CATEGORY_MAP.BROWGEL:
        applyBrowgelEye({ face, ctx, rgb, dimension, alpha, pattern });
        return;
      case TRY_ON_SUB_CATEGORY_MAP.MASCARA:
        applyMascaraEye({ face, ctx, rgb, dimension, alpha, pattern });
        return;
      case TRY_ON_SUB_CATEGORY_MAP.LASHES:
        applyLashesEye({ face, ctx, rgb, dimension, alpha, pattern });
        return;
    }
  }
}
