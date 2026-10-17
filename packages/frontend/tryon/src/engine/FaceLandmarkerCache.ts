import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';

import { TRYON_MODEL_PATHS } from '../constants/assets.js';
import type { ITryOnModelUrls } from '../types/assets.js';
import type { TRunningMode } from '../types/index.js';
import { createSharedModelCache } from '../utils/index.js';

// The model and the WebAssembly runtime come from the addresses the cache was asked for (see
// `ITryOnAssets`): by default the assets package and the same version of `@mediapipe/tasks-vision`
// in the CDN. The JavaScript and the WebAssembly of MediaPipe have to be the same version - a
// mix fails at runtime with errors like `ASM_CONSTS[code] is not a function` - which
// `MEDIAPIPE_TASKS_VISION_VERSION` and the exact dependency of this package keep true.
//
// The model is a file of the assets package (float16 face_landmarker.task, ~3.7MB, as Google
// publishes it) rather than fetched from Google's `storage.googleapis.com`: that URL sends
// `Cache-Control: max-age=3600`, just 1 hour, so any return visit past that re-downloads the
// full model, while the CDN (or a host of your own) serves a file of a version for a year.
const createLandmarker = async (
  canvas: HTMLCanvasElement,
  mode: TRunningMode,
  { modelUrl, wasmBaseUrl }: ITryOnModelUrls,
): Promise<FaceLandmarker> => {
  const vision = await FilesetResolver.forVisionTasks(wasmBaseUrl);

  const createWithDelegate = (delegate: 'GPU' | 'CPU') =>
    FaceLandmarker.createFromOptions(vision, {
      baseOptions: { modelAssetPath: modelUrl, delegate },
      outputFaceBlendshapes: true,
      runningMode: mode,
      canvas,
      numFaces: 1,
    });

  try {
    return await createWithDelegate('GPU');
  } catch (err) {
    console.warn('FaceLandmarker GPU delegate failed, falling back to CPU', err);
    return await createWithDelegate('CPU');
  }
};

/**
 * Lazily creates (once) and caches a `FaceLandmarker` per running mode (and per address of the
 * files), shared across every category engine and every open/close of the Try-On modal for the
 * lifetime of the page - MediaPipe binds a landmarker to a mode at creation, so VIDEO and IMAGE
 * each get their own instance, but re-entering Live mode or reopening the modal reuses the
 * existing one instead of re-downloading/re-initializing the ~3.7MB model.
 *
 * `signal` only governs whether *this* call bails out of waiting - it never cancels an
 * in-flight shared creation another caller may still be waiting on, so the cache still warms
 * up even if the first caller to trigger it unmounts before it resolves. The memoize/abort-race
 * mechanics themselves live in `createSharedModelCache` (shared with `HairSegmenterCache.ts`/
 * `HandLandmarkerCache.ts` - confirmed identical across all three before factoring it out).
 */
export const getSharedFaceLandmarker = createSharedModelCache(
  TRYON_MODEL_PATHS.face,
  createLandmarker,
);
