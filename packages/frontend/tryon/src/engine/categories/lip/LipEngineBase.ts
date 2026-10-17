import { TRY_ON_SUB_CATEGORY_MAP } from '@beautinique/frontend-constants';

import { resolveTryOnAssetUrl } from '../../../constants/assets.js';
import {
  CRAYON_TEXTURE_PATH,
  GLOSS_OR_SATIN_OR_BALM_OR_PLUMPER_TEXTURE_PATH_LOWER,
  GLOSS_OR_SATIN_OR_BALM_OR_PLUMPER_TEXTURE_PATH_UPPER,
  LIP_DEFAULT_RANGE,
  METALLIC_TEXTURE_PATH_LOWER,
  METALLIC_TEXTURE_PATH_UPPER,
  OIL_TEXTURE_PATH_LOWER,
  OIL_TEXTURE_PATH_UPPER,
  SHIMMER_TEXTURE_PATH,
} from '../../../constants/lip.js';
import type { IApplyEffectParams } from '../../../types/index.js';
import type { ILipAssets, ILipTryOnState, TLipFinish } from '../../../types/lip.js';
import { loadImage, toColorString } from '../../../utils/index.js';
import {
  applyBalmLips,
  applyCrayonLips,
  applyGlossLips,
  applyLinerLips,
  applyMatteLips,
  applyMetallicLips,
  applyOilLips,
  applyPlumperLips,
  applySatinLips,
  applyShimmerLips,
  applyStainLips,
} from '../../../utils/lip.js';
import { FaceLandmarkerEngineBase } from '../../FaceLandmarkerEngineBase.js';

// Finishes that don't have dedicated rendering yet (need new texture art or new stroke/
// dilation logic that doesn't exist in the reference this was ported from) - see
// docs/tryons/LIP.md. Rendered as MATTE with a console warning rather than silently pretending
// to be correct. Empty now that all 11 LIP subcategories have dedicated rendering - kept (not
// deleted) as the landing spot for any future subcategory added to `TLipFinish` before its own
// renderer exists.
const UNSUPPORTED_LIP_FINISHES = new Set<TLipFinish>([]);

/**
 * LIP category engine: loads the 4 lip texture images once, and applies the right finish
 * rendering per `state.type`. Still abstract - `getRunningMode`/`onTryOnReady`/
 * `onStateUpdated` are filled in by whichever mode mixin wraps this (see LipLiveEngine.ts /
 * LipUploadEngine.ts) - this class only ever needs to know about LIP, never about Live vs
 * Upload.
 */
export abstract class LipEngineBase extends FaceLandmarkerEngineBase<ILipTryOnState, ILipAssets> {
  protected getInitialState(): ILipTryOnState {
    return {
      type: null,
      color: null,
      // No `type` yet to pick a finish-specific default from (`LIP_RANGE_BOUNDS` is now keyed
      // per finish) - this blank-slate value only matters for the brief moment before the
      // caller's own `initialState` (which does know the finish - see TryOnModal's `rangeBounds`)
      // merges in, so it uses the category-wide `LIP_DEFAULT_RANGE` rather than borrowing any
      // one finish's own default (see that constant's own comment for why).
      range: LIP_DEFAULT_RANGE,
      cameraReady: false,
      imageReady: false,
      tryOnStarted: false,
      // Matches `getFaceDetectionStatus`'s own no-landmarks-yet result - nothing's been
      // through a `renderFrame` pass at this point to say otherwise.
      detectionStatus: 'not-in-frame',
    };
  }

  protected async loadCategoryAssets(signal: AbortSignal): Promise<ILipAssets | null> {
    // The texture paths are paths inside the assets package; the address comes from the `assets`
    // option the engine was made with.
    const texture = (path: string) =>
      loadImage(resolveTryOnAssetUrl(path, this.options.assets), signal);

    const [
      glossOrSatinOrBalmOrPlumperUpper,
      glossOrSatinOrBalmOrPlumperLower,
      crayon,
      shimmer,
      oilUpper,
      oilLower,
      metallicUpper,
      metallicLower,
    ] = await Promise.allSettled([
      texture(GLOSS_OR_SATIN_OR_BALM_OR_PLUMPER_TEXTURE_PATH_UPPER),
      texture(GLOSS_OR_SATIN_OR_BALM_OR_PLUMPER_TEXTURE_PATH_LOWER),
      texture(CRAYON_TEXTURE_PATH),
      texture(SHIMMER_TEXTURE_PATH),
      texture(OIL_TEXTURE_PATH_UPPER),
      texture(OIL_TEXTURE_PATH_LOWER),
      texture(METALLIC_TEXTURE_PATH_UPPER),
      texture(METALLIC_TEXTURE_PATH_LOWER),
    ]);

    if (
      glossOrSatinOrBalmOrPlumperUpper.status !== 'fulfilled' ||
      glossOrSatinOrBalmOrPlumperLower.status !== 'fulfilled' ||
      crayon.status !== 'fulfilled' ||
      shimmer.status !== 'fulfilled' ||
      oilUpper.status !== 'fulfilled' ||
      oilLower.status !== 'fulfilled' ||
      metallicUpper.status !== 'fulfilled' ||
      metallicLower.status !== 'fulfilled'
    ) {
      console.error('Failed to load one or more lip textures', {
        glossOrSatinOrBalmOrPlumperUpper,
        glossOrSatinOrBalmOrPlumperLower,
        crayon,
        shimmer,
        oilUpper,
        oilLower,
        metallicUpper,
        metallicLower,
      });
      return null;
    }

    return {
      crayon: crayon.value,
      shimmer: shimmer.value,
      oilUpper: oilUpper.value,
      oilLower: oilLower.value,
      glossUpper: glossOrSatinOrBalmOrPlumperUpper.value,
      glossLower: glossOrSatinOrBalmOrPlumperLower.value,
      plumperUpper: glossOrSatinOrBalmOrPlumperUpper.value,
      plumperLower: glossOrSatinOrBalmOrPlumperLower.value,
      balmLower: glossOrSatinOrBalmOrPlumperLower.value,
      balmUpper: glossOrSatinOrBalmOrPlumperUpper.value,
      satinLower: glossOrSatinOrBalmOrPlumperLower.value,
      satinUpper: glossOrSatinOrBalmOrPlumperUpper.value,
      metallicUpper: metallicUpper.value,
      metallicLower: metallicLower.value,
    };
  }

  protected applyEffect({
    face,
    ctx,
    dimension,
    rgb,
    state,
    assets,
  }: IApplyEffectParams<ILipTryOnState, ILipAssets>): void {
    if (!state.type) return;

    const [r, g, b] = rgb;
    const color = toColorString(r, g, b, 0.6);
    const alpha = state.range;
    const base = { face, ctx, color, dimension, alpha };

    if (UNSUPPORTED_LIP_FINISHES.has(state.type)) {
      console.warn(
        `LIP finish "${state.type}" doesn't have dedicated rendering yet - falling back to MATTE.`,
      );
      applyMatteLips(base);
      return;
    }

    switch (state.type) {
      case TRY_ON_SUB_CATEGORY_MAP.MATTE:
        applyMatteLips(base);
        return;
      case TRY_ON_SUB_CATEGORY_MAP.STAIN:
        applyStainLips(base);
        return;
      case TRY_ON_SUB_CATEGORY_MAP.LINER:
        applyLinerLips(base);
        return;
    }

    // Everything past this point needs the loaded texture assets.
    if (!assets) return;

    switch (state.type) {
      case TRY_ON_SUB_CATEGORY_MAP.SATIN:
        applySatinLips({
          ...base,
          textureUpper: assets.satinUpper,
          textureLower: assets.satinLower,
        });
        return;
      case TRY_ON_SUB_CATEGORY_MAP.GLOSS:
        applyGlossLips({
          ...base,
          textureUpper: assets.glossUpper,
          textureLower: assets.glossLower,
        });
        return;
      case TRY_ON_SUB_CATEGORY_MAP.BALM:
        applyBalmLips({ ...base, textureUpper: assets.balmUpper, textureLower: assets.balmLower });
        return;
      case TRY_ON_SUB_CATEGORY_MAP.PLUMPER:
        applyPlumperLips({
          ...base,
          textureUpper: assets.plumperUpper,
          textureLower: assets.plumperLower,
        });
        return;
      case TRY_ON_SUB_CATEGORY_MAP.OIL:
        applyOilLips({ ...base, textureUpper: assets.oilUpper, textureLower: assets.oilLower });
        return;
      case TRY_ON_SUB_CATEGORY_MAP.SHIMMER:
        applyShimmerLips({ ...base, texture: assets.shimmer });
        return;
      case TRY_ON_SUB_CATEGORY_MAP.CRAYON:
        applyCrayonLips({ ...base, texture: assets.crayon });
        return;
      case TRY_ON_SUB_CATEGORY_MAP.METALLIC:
        applyMetallicLips({
          ...base,
          textureUpper: assets.metallicUpper,
          textureLower: assets.metallicLower,
        });
        return;
    }
  }
}
