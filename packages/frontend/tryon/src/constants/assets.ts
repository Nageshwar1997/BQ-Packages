import type { ITryOnAssets } from '../types/assets.js';

/*
 * Where the models and the images of the try-on come from, and how the address of one is made.
 * `src/constants/assets.test.ts` checks the three versions below against the real ones (the assets
 * package of this monorepo, the dependency, the installed MediaPipe), so a bump that forgets one of
 * them fails the tests instead of failing in a browser.
 */

/** The package that holds the models and the images. */
export const TRYON_ASSETS_PACKAGE = '@beautinique/frontend-tryon-assets';

/**
 * The version of the assets package this version of the try-on was tested with. The files of a
 * published version never change (the CDN keeps them for a year), so it is exact.
 */
export const TRYON_ASSETS_VERSION = '1.0.0';

/**
 * The version of `@mediapipe/tasks-vision`. Its JavaScript (the dependency) and its WebAssembly (loaded
 * from the CDN) have to be the same version, or it fails with errors like `ASM_CONSTS[code] is not a
 * function`: the dependency of this package is exact, and it is this constant.
 */
export const MEDIAPIPE_TASKS_VISION_VERSION = '1.0.1';

/** The assets package in the jsDelivr CDN: every file of an npm package is there, with a long cache. */
export const DEFAULT_TRYON_ASSETS_BASE_URL = `https://cdn.jsdelivr.net/npm/${TRYON_ASSETS_PACKAGE}@${TRYON_ASSETS_VERSION}/`;

/** The WebAssembly files of MediaPipe in the CDN (the jsDelivr cache of a version is one year). */
export const DEFAULT_MEDIAPIPE_WASM_BASE_URL = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MEDIAPIPE_TASKS_VISION_VERSION}/wasm`;

/** The three models, by their path inside the assets package. */
export const TRYON_MODEL_PATHS = {
  /** Lips, face and eyes (they all follow the face). */
  face: 'models/face_landmarker.task',
  /** Nails. */
  hand: 'models/hand_landmarker.task',
  /** Hair. */
  hair: 'models/hair_segmenter.tflite',
} as const;

const withClosingSlash = (url: string) => (url.endsWith('/') ? url : `${url}/`);

const withoutClosingSlash = (url: string) => url.replace(/\/+$/, '');

/**
 * The address of a file of the assets package, from its path inside it (`'images/eye/kajal/Bold.webp'`).
 * `assets.resolve` wins, then `assets.baseUrl`, then the CDN.
 */
export const resolveTryOnAssetUrl = (path: string, assets?: ITryOnAssets) => {
  if (assets?.resolve) {
    return assets.resolve(path);
  }

  return `${withClosingSlash(assets?.baseUrl ?? DEFAULT_TRYON_ASSETS_BASE_URL)}${path.replace(/^\/+/, '')}`;
};

/** The address of the folder of the WebAssembly files of MediaPipe, without a closing slash. */
export const resolveTryOnWasmBaseUrl = (assets?: ITryOnAssets) =>
  withoutClosingSlash(assets?.wasmBaseUrl ?? DEFAULT_MEDIAPIPE_WASM_BASE_URL);
