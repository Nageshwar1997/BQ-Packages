import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';

import { TRYON_MODEL_PATHS } from '../constants/assets.js';
import type { ITryOnModelUrls } from '../types/assets.js';
import type { TRunningMode } from '../types/index.js';
import { createSharedModelCache } from '../utils/index.js';

// The model and the WebAssembly runtime come from the addresses the cache was asked for, the same
// way as in FaceLandmarkerCache.ts (see its comment: the version of the WebAssembly is the one of
// the JavaScript, and the model is a file of the assets package, not Google's 1-hour cache).
// ~7.8MB, Google's published "Hand Landmarker" model (21 hand-knuckle landmarks
// per detected hand) - see docs/tryons/NAIL-PLAN.md's Research section for why this (not a
// nail-specific segmentation model - none exists off-the-shelf) is the right tracking model.
const createLandmarker = async (
  canvas: HTMLCanvasElement,
  mode: TRunningMode,
  { modelUrl, wasmBaseUrl }: ITryOnModelUrls,
): Promise<HandLandmarker> => {
  const vision = await FilesetResolver.forVisionTasks(wasmBaseUrl);

  const createWithDelegate = (delegate: 'GPU' | 'CPU') =>
    HandLandmarker.createFromOptions(vision, {
      baseOptions: { modelAssetPath: modelUrl, delegate },
      runningMode: mode,
      canvas,
      // A real nail try-on almost always wants both hands paintable at once, not just whichever
      // one the model happens to detect first - see docs/tryons/NAIL-PLAN.md's Open question 2 on
      // the extra per-frame cost this adds in Live mode.
      numHands: 2,
    });

  try {
    return await createWithDelegate('GPU');
  } catch (err) {
    console.warn('HandLandmarker GPU delegate failed, falling back to CPU', err);
    return await createWithDelegate('CPU');
  }
};

/**
 * Lazily creates (once) and caches a `HandLandmarker` per running mode, shared across every
 * open/close of the Try-On modal for the lifetime of the page - mirrors
 * `getSharedFaceLandmarker` (FaceLandmarkerCache.ts) exactly, just for NAIL's hand-tracking model
 * instead of the face-landmark one, via the same shared `createSharedModelCache`.
 */
export const getSharedHandLandmarker = createSharedModelCache(
  TRYON_MODEL_PATHS.hand,
  createLandmarker,
);
