import type { ImageSegmenterResult } from '@mediapipe/tasks-vision';
import { FilesetResolver, ImageSegmenter } from '@mediapipe/tasks-vision';

import { TRYON_MODEL_PATHS } from '../constants/assets.js';
import type { ITryOnModelUrls } from '../types/assets.js';
import type { IHairMask } from '../types/hair.js';
import type { TRunningMode } from '../types/index.js';
import { createSharedModelCache } from '../utils/index.js';

// The model and the WebAssembly runtime come from the addresses the cache was asked for, the same
// way as in FaceLandmarkerCache.ts (see its comment: the version of the WebAssembly is the one of
// the JavaScript, and the model is a file of the assets package, not Google's 1-hour cache).
// ~782KB, Google's published "Hair Segmenter" model (2-class: background=0, hair=1,
// `outputConfidenceMasks`) - chosen over Selfie Segmentation (no hair-specific class at all),
// Multi-Class Selfie Segmentation (has a hair class, but half the input resolution - 256x256 vs
// this model's 512x512 - since it splits capacity across 6 classes instead of specializing), and
// DeepLab-v3 (wrong domain entirely, general scene objects, no hair class). Full reasoning in
// docs/tryons/HAIR-PLAN.md's Research section.
const createSegmenter = async (
  canvas: HTMLCanvasElement,
  mode: TRunningMode,
  { modelUrl, wasmBaseUrl }: ITryOnModelUrls,
): Promise<ImageSegmenter> => {
  const vision = await FilesetResolver.forVisionTasks(wasmBaseUrl);

  const createWithDelegate = (delegate: 'GPU' | 'CPU') =>
    ImageSegmenter.createFromOptions(vision, {
      baseOptions: { modelAssetPath: modelUrl, delegate },
      runningMode: mode,
      canvas,
      // Confidence masks (per-pixel [0,1] probability), not the hard category mask - a hard
      // 0/1-per-pixel read would show jagged/aliased hair edges, unlike every other soft-edged
      // effect in this app (`drawFeatheredBlob`/`fillFaceOvalRegion`). See HAIR-PLAN.md's Research
      // section.
      outputConfidenceMasks: true,
      outputCategoryMask: false,
    });

  try {
    return await createWithDelegate('GPU');
  } catch (err) {
    console.warn('ImageSegmenter GPU delegate failed, falling back to CPU', err);
    return await createWithDelegate('CPU');
  }
};

/**
 * Lazily creates (once) and caches an `ImageSegmenter` per running mode, shared across every
 * open/close of the Try-On modal for the lifetime of the page - mirrors
 * `getSharedFaceLandmarker` (FaceLandmarkerCache.ts) exactly, just for HAIR's segmentation model
 * instead of the face-landmark one, via the same shared `createSharedModelCache`. The *detector*
 * itself (`createSegmenter` below) still stays a separate, bespoke function per model - see
 * docs/tryons/HAIR-PLAN.md's "Engine architecture" section for why HAIR's tracking stack stays
 * parallel rather than folded into the landmark one; only the generic memoize/abort-race
 * wrapper around it was ever truly shared.
 */
export const getSharedHairSegmenter = createSharedModelCache(
  TRYON_MODEL_PATHS.hair,
  createSegmenter,
);

// Pulls the hair-confidence mask out of a raw `ImageSegmenterResult` into this app's own plain
// `IHairMask` shape - index 1, per the Hair Segmenter model's own published category order
// (background=0, hair=1, see docs/tryons/HAIR-PLAN.md's Research section). `getAsFloat32Array()`
// copies the data into a fresh, independently-owned array (not a live view into MediaPipe's own
// WASM/GPU memory) - safe to hold onto after this call returns, unlike the `MPMask`/`result`
// objects themselves.
//
// `closeMask` matters here: a mask handed to us *inside* a segmentForVideo/segment callback
// (`withLiveCamera.ts (HairSegmenterEngineBase.detectFrameForLive)`'s Live-mode loop) is task-owned and freed automatically once
// the callback returns (per `MPMask.close()`'s own doc comment) - closing it ourselves there would
// be redundant. A mask returned by the *synchronous* `segment()` overload
// (`withImageUpload.ts (HairSegmenterEngineBase.detectFrameForUpload)`, called once per uploaded photo) is instead an app-owned copy
// the task explicitly hands off to us - that one this app is responsible for freeing once the
// `Float32Array` copy is safely extracted.
export const extractHairMask = (
  result: ImageSegmenterResult,
  closeMask: boolean,
): IHairMask | null => {
  const hairConfidence = result.confidenceMasks?.[1];
  if (!hairConfidence) return null;

  const mask: IHairMask = {
    data: hairConfidence.getAsFloat32Array(),
    width: hairConfidence.width,
    height: hairConfidence.height,
  };

  if (closeMask) hairConfidence.close();

  return mask;
};
