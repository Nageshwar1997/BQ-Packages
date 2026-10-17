import { TRY_ON_SUB_CATEGORY_MAP } from '@beautinique/frontend-constants';
import type { NormalizedLandmark } from '@mediapipe/tasks-vision';

import { FACE_DEFAULT_RANGE } from '../../../constants/face.js';
import type { IFaceAssets, IFaceTryOnState, TFaceFinish } from '../../../types/face.js';
import type { IApplyEffectParams } from '../../../types/index.js';
import {
  applyBbCreamFace,
  applyBlushFace,
  applyBronzerFace,
  applyCompactPowderFace,
  applyConcealerFace,
  applyContourFace,
  applyFoundationFace,
  applyHighlighterFace,
  isFaceTurnedTooMuch,
} from '../../../utils/face.js';
import { FaceLandmarkerEngineBase } from '../../FaceLandmarkerEngineBase.js';

// Finishes that don't have dedicated rendering yet - same landing-spot pattern as LIP's
// `UNSUPPORTED_LIP_FINISHES` (see LipEngineBase.ts), falls back to FOUNDATION (the most basic
// full-face tint) with a console warning rather than silently doing nothing. Empty now that every
// FACE finish has dedicated rendering - kept (rather than deleted) as the landing spot for any
// future FACE finish added later, same as LIP's own set never got removed either.
const UNSUPPORTED_FACE_FINISHES = new Set<TFaceFinish>([]);

/**
 * FACE category engine - fresh design (not ported from any reference implementation, see
 * docs/tryons/FACE.md), built on the exact same shared machinery LIP already proved out
 * (`FaceLandmarkerEngineBase`/`withLiveCamera`/`withImageUpload`). Still abstract -
 * `getRunningMode`/`onTryOnReady`/`onStateUpdated` are filled in by whichever mode mixin wraps
 * this (see FaceLiveEngine.ts/FaceUploadEngine.ts).
 */
export abstract class FaceEngineBase extends FaceLandmarkerEngineBase<IFaceTryOnState> {
  protected getInitialState(): IFaceTryOnState {
    return {
      type: null,
      color: null,
      // No `type` yet to pick a finish-specific default from (`FACE_RANGE_BOUNDS` is now keyed
      // per finish) - same reasoning as LipEngineBase's identical comment. Uses the category-wide
      // `FACE_DEFAULT_RANGE` rather than borrowing FOUNDATION's own default.
      range: FACE_DEFAULT_RANGE,
      cameraReady: false,
      imageReady: false,
      tryOnStarted: false,
      detectionStatus: 'not-in-frame',
    };
  }

  protected loadCategoryAssets(): Promise<IFaceAssets> {
    return Promise.resolve(null);
  }

  // Only downgrades an already-'detected' reading - a face that's out of frame or too small is
  // already flagged for a more basic reason, and checking turn on landmarks that unreliable
  // would just be noise. See `isFaceTurnedTooMuch`'s own comment for why FACE specifically needs
  // this (its full-face finishes, unlike LIP's lip-only region) and why no other category
  // overrides this hook.
  protected refineDetectionStatus(
    status: IFaceTryOnState['detectionStatus'],
    face: NormalizedLandmark[] | undefined,
  ): IFaceTryOnState['detectionStatus'] {
    if (status !== 'detected' || !face) return status;
    return isFaceTurnedTooMuch(face) ? 'turned' : status;
  }

  protected applyEffect({
    face,
    ctx,
    dimension,
    rgb,
    state,
  }: IApplyEffectParams<IFaceTryOnState, IFaceAssets>): void {
    if (!state.type) return;
    // `renderFrame` (FaceLandmarkerEngineBase) only ever uses `detectionStatus` to drive the overlay - it
    // still calls this on a 'not-clear'/'not-in-frame' reading too, deliberately (a stray frame
    // of jitter shouldn't blank the canvas before the debounced overlay even shows), and for
    // those two a face that's just small/blurry still renders a reasonably faithful tint anyway.
    // 'turned' is different on purpose: the whole reason it exists is that a turned head can
    // render a genuinely *wrong* shape here (see tryon-utils/face.ts's own history - tint
    // bulging past the visible nose). The overlay (`TryOnOverlay`) sits on a semi-transparent
    // `bg-black/45` scrim, not a fully opaque one, so without this guard that bad shape would
    // still show dimly *through* the "face the camera" message instead of actually going away.
    if (state.detectionStatus === 'turned') return;

    const alpha = state.range;
    const params = { face, ctx, rgb, dimension, alpha };

    if (UNSUPPORTED_FACE_FINISHES.has(state.type)) {
      console.warn(
        `FACE finish "${state.type}" doesn't have dedicated rendering yet - falling back to FOUNDATION.`,
      );
      applyFoundationFace(params);
      return;
    }

    switch (state.type) {
      case TRY_ON_SUB_CATEGORY_MAP.FOUNDATION:
        applyFoundationFace(params);
        return;
      case TRY_ON_SUB_CATEGORY_MAP.BLUSH:
        applyBlushFace(params);
        return;
      case TRY_ON_SUB_CATEGORY_MAP.CONCEALER:
        applyConcealerFace(params);
        return;
      case TRY_ON_SUB_CATEGORY_MAP.HIGHLIGHTER:
        applyHighlighterFace(params);
        return;
      case TRY_ON_SUB_CATEGORY_MAP.CONTOUR:
        applyContourFace(params);
        return;
      case TRY_ON_SUB_CATEGORY_MAP.BRONZER:
        applyBronzerFace(params);
        return;
      case TRY_ON_SUB_CATEGORY_MAP.BBCREAM:
        applyBbCreamFace(params);
        return;
      case TRY_ON_SUB_CATEGORY_MAP.COMPACTPOWDER:
        applyCompactPowderFace(params);
        return;
    }
  }
}
