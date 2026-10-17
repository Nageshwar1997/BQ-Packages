import type { NormalizedLandmark } from '@mediapipe/tasks-vision';

import { resolveTryOnAssetUrl, resolveTryOnWasmBaseUrl } from '../constants/assets.js';
import type { ITryOnAssets, ITryOnModelUrls } from '../types/assets.js';
import type {
  IObjectFitContentRect,
  TDetectionStatus,
  TDimension,
  TRGBATuple,
  TRunningMode,
} from '../types/index.js';

// Category-agnostic helpers for the Try-On rendering engine (`@/classes/tryon`) - canvas
// sizing, snapshot capture, color parsing, abort-aware image loading. Ported from the
// reference implementation's `virtual-tryon/utils/index.ts`; nothing here is LIP-specific
// (that lives in `./lip.ts`).

// Landmark x/y are normalized 0-1 fractions of the analyzed frame - a point at/past this margin
// from any edge counts as the face being cut off by the frame boundary, not fully "in frame".
// Deliberately tiny: MediaPipe's face mesh covers the *whole* face oval, including the jaw,
// ears, and hairline - for any normal, reasonably-close headshot (the expected framing for a
// makeup tryon, since people want to actually see their lips), those outer contour points
// routinely sit within a few percent of the image edge even though nothing is actually cut off.
// A looser margin (this was 0.02) was flagging completely normal framing as "not in frame" -
// this should only trip for a landmark genuinely at/past the boundary.
//
// Loosened again (0.002 -> 0.01) after real-device testing: a phone held at typical selfie
// distance/arm's length sits closer to the face than a desktop webcam usually does, so the
// whole-face-oval landmarks this reads (ears/jaw/hairline included - the same full mesh
// regardless of category) naturally spread closer to the raw frame's own edges even with
// completely normal framing, just because the face fills more of the frame. Still tight enough
// to catch a landmark genuinely at/past the boundary (nowhere near the original 0.02 that was
// too loose in the other direction) - this only ever makes "in frame" *more* forgiving, so it
// can't reintroduce that original problem for any category already relying on this check.
const FACE_FRAME_EDGE_MARGIN = 0.01;
// The detected face's own bounding box (in that same 0-1 space) must span at least this much of
// the frame on both axes - below it, the face is too small/far away to trust makeup placement
// on, even though MediaPipe still reports landmarks for it.
const FACE_MIN_SIZE_RATIO = 0.15;

// Derives a coarse "can we trust this frame's face enough to draw makeup on it" signal purely
// from landmark positions (no pixel/brightness analysis) - see `TDetectionStatus`'s own
// comment for what each result means and why it's recomputed every frame rather than latched
// once. `face` is `FaceLandmarkerEngineBase`'s `this.landmark.faceLandmarks[0]` - `undefined` when
// MediaPipe found no face at all this frame.
export const getFaceDetectionStatus = (
  face: NormalizedLandmark[] | undefined,
): TDetectionStatus => {
  if (!face || face.length === 0) return 'not-in-frame';

  let minX = 1;
  let maxX = 0;
  let minY = 1;
  let maxY = 0;
  for (const point of face) {
    if (point.x < minX) minX = point.x;
    if (point.x > maxX) maxX = point.x;
    if (point.y < minY) minY = point.y;
    if (point.y > maxY) maxY = point.y;
  }

  const touchesFrameEdge =
    minX <= FACE_FRAME_EDGE_MARGIN ||
    maxX >= 1 - FACE_FRAME_EDGE_MARGIN ||
    minY <= FACE_FRAME_EDGE_MARGIN ||
    maxY >= 1 - FACE_FRAME_EDGE_MARGIN;
  if (touchesFrameEdge) return 'not-in-frame';

  const isTooSmall = maxX - minX < FACE_MIN_SIZE_RATIO || maxY - minY < FACE_MIN_SIZE_RATIO;
  if (isTooSmall) return 'not-clear';

  return 'detected';
};

// The core `object-fit` scale-factor math, shared by `resizeElements` and
// `getObjectFitContentRect` below - see that function's own comment for what each value means.
const getObjectFitScale = (
  boxWidth: number,
  boxHeight: number,
  contentWidth: number,
  contentHeight: number,
  objectFit: string,
): number => {
  const widthScale = boxWidth / contentWidth;
  const heightScale = boxHeight / contentHeight;

  switch (objectFit) {
    case 'cover':
      return Math.max(widthScale, heightScale);
    case 'fill':
      // Stretches independently per axis to exactly match the box - width always ends up
      // exactly `boxWidth`, which `widthScale` alone already produces here.
      return widthScale;
    case 'none':
      return 1;
    case 'scale-down':
      return Math.min(1, widthScale, heightScale);
    case 'contain':
    default:
      return Math.min(widthScale, heightScale);
  }
};

// `object-fit` is a static class on a Try-On canvas - never toggled at runtime - so it's safe
// (and, for `resizeElements` below, important - it runs on every video frame in Live mode) to
// read it only once per canvas rather than forcing a style recalculation on every call.
const objectFitCache = new WeakMap<HTMLCanvasElement, string>();

const getCachedObjectFit = (canvas: HTMLCanvasElement): string => {
  let objectFit = objectFitCache.get(canvas);
  if (objectFit === undefined) {
    objectFit = getComputedStyle(canvas).objectFit;
    objectFitCache.set(canvas, objectFit);
  }
  return objectFit;
};

// Ceiling on how far `resizeElements` below will scale `canvas2`'s backing store up for device
// pixel density. Perceived sharpness past 2x is marginal, while every per-frame `drawImage`/
// fill/stroke cost in Live mode's continuous render loop scales with the *square* of this
// number - uncapped, a 3x phone would pay 2.25x the render cost of a capped 2x for a difference
// nobody can actually see. 2 is the same ceiling most canvas/WebGL apps settle on for this exact
// tradeoff. Read fresh every call (not cached like `object-fit` above) since, unlike a fixed CSS
// class, `devicePixelRatio` can genuinely change mid-session (dragging the window to a different
// monitor, browser zoom) - it's a plain property read, not a forced style recalculation, so
// there's no real cost to staying correct here.
const MAX_RENDER_DEVICE_PIXEL_RATIO = 2;

// Sizes both render canvases to the source's native resolution, then scales their CSS display
// size to fit within the parent container on *both* axes - matching whichever `object-fit` the
// canvas is actually set to (`contain` for Upload, `cover` for Live - see
// components/layout/tryons/lip/LipUploadStage.tsx/LipLiveStage.tsx, or their FACE equivalents).
// This used to only scale to fill the parent's height, uncapped on width;
// on a narrow/tall container (a mobile canvas panel) with a landscape-aspect photo, that could
// size the canvas wider than its box - `overflow-hidden` on the panel then silently cropped the
// sides instead of showing the whole photo, which is exactly wrong for Upload's intended
// `contain` behavior (Live's `cover` happened to still look fine, since cropping overflow *is*
// what `cover` wants - this was only ever visibly broken for Upload).
export const resizeElements = (
  source: HTMLVideoElement | HTMLImageElement,
  canvas1: HTMLCanvasElement,
  canvas2: HTMLCanvasElement,
) => {
  const width = source instanceof HTMLVideoElement ? source.videoWidth : source.naturalWidth;
  const height = source instanceof HTMLVideoElement ? source.videoHeight : source.naturalHeight;

  if (!width || !height) return;

  // `canvas1` only ever feeds MediaPipe's FaceLandmarker (as a GL-context host at init - see
  // `getSharedFaceLandmarker` - detection itself runs directly against the source `<video>`/
  // `<img>` element, see `withLiveCamera.ts`/`withImageUpload.ts`, never against this canvas's
  // pixels). Detection accuracy comes from the source's own real pixel content, not from how
  // many pixels the canvas *holding a GL context* has, so this always stays at the source's
  // native resolution - the device-pixel-ratio upscaling below deliberately never touches it,
  // since that would only add cost for zero detection benefit.
  canvas1.width = width;
  canvas1.height = height;

  const parent = canvas1.parentElement?.getBoundingClientRect();
  const parentWidth = parent?.width ?? width;
  const parentHeight = parent?.height ?? height;

  const scale = getObjectFitScale(
    parentWidth,
    parentHeight,
    width,
    height,
    getCachedObjectFit(canvas1),
  );
  const displayWidth = width * scale;
  const displayHeight = height * scale;

  canvas1.style.width = `${String(displayWidth)}px`;
  canvas1.style.height = `${String(displayHeight)}px`;
  canvas2.style.width = `${String(displayWidth)}px`;
  canvas2.style.height = `${String(displayHeight)}px`;

  // `canvas2` is the actual visible/downloadable output (see `FaceLandmarkerEngineBase.renderFrame`,
  // `captureSnapShot`) - every draw call there already reads its own width/height back off
  // `canvas2` rather than assuming it matches `canvas1`, so scaling only this one up is fully
  // self-contained: nothing downstream needs to know it happened. `scale * dpr` is exactly the
  // backing-store multiplier `displayWidth`/`displayHeight` (CSS px) need to be fully covered by
  // real device pixels - one multiplication covers both axes because `getObjectFitScale`
  // guarantees a single *uniform* factor for both (true for `cover`/`contain`, the only two
  // modes either stage class uses; only `fill`'s independent per-axis stretch would break this).
  // `Math.max(1, ...)` means this only ever *adds* resolution for a source that's genuinely
  // under-resolved for its display size (e.g. Live's webcam feed shown large on a high-DPR
  // screen) - never shrinks `canvas2` below the source's native resolution, which an uploaded
  // photo already exceeds in the common case.
  const dpr = Math.min(window.devicePixelRatio || 1, MAX_RENDER_DEVICE_PIXEL_RATIO);
  const renderScale = Math.max(1, scale * dpr);

  canvas2.width = width * renderScale;
  canvas2.height = height * renderScale;
};

// Creates a fresh off-screen canvas at `dimension`'s size and returns its 2D context - the
// "build on a scratch canvas, composite once" shape every temp-canvas compositing step in this
// app repeats (`captureSnapShot` right below; LIP's `applyMatteLips`/`applyLinerLips`/
// `applyTexturedLips`; FACE's `fillFaceOvalRegion`/`applyBlushFace`/`applyConcealerFace`/
// `applyHighlighterFace`/`applyContourFace`) - needed because the *real* canvas ultimately being
// painted onto may have a mirror transform active (Live mode) that only the final composite draw
// should go through, not every intermediate step. Returns `null` (never throws) when
// `getContext('2d')` fails, matching every existing caller's own "if (!ctx) return/return null"
// shape - a returned context's own `.canvas` property is the backing `HTMLCanvasElement` itself
// (see `captureSnapShot`), so callers never need to hold onto both separately. Takes anything
// shaped like `TDimension` (an actual `HTMLCanvasElement`'s own `width`/`height` qualify too, see
// `captureSnapShot`'s own call), not just a plain dimension object.
export const createOffscreenCtx = (dimension: TDimension): CanvasRenderingContext2D | null => {
  const canvas = document.createElement('canvas');
  canvas.width = dimension.width;
  canvas.height = dimension.height;
  return canvas.getContext('2d');
};

// Composites the source frame (mirrored for a live camera, as-is for an uploaded image)
// with the makeup overlay canvas on top, and returns a downloadable PNG data URL.
export const captureSnapShot = (
  source: HTMLVideoElement | HTMLImageElement,
  overlayCanvas: HTMLCanvasElement,
): string | null => {
  const ctx = createOffscreenCtx(overlayCanvas);
  if (!ctx) return null;
  const tempCanvas = ctx.canvas;

  if (source instanceof HTMLVideoElement) {
    ctx.save();
    ctx.translate(tempCanvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(source, 0, 0, tempCanvas.width, tempCanvas.height);
    ctx.restore();
  } else {
    ctx.drawImage(source, 0, 0, tempCanvas.width, tempCanvas.height);
  }

  ctx.drawImage(overlayCanvas, 0, 0);

  return tempCanvas.toDataURL('image/png');
};

export const hexToRGBA = (hex: string, alpha = 1): TRGBATuple => {
  const clean = hex.replace('#', '');

  const [r, g, b] =
    clean.length === 3
      ? [
          parseInt(clean.charAt(0) + clean.charAt(0), 16),
          parseInt(clean.charAt(1) + clean.charAt(1), 16),
          parseInt(clean.charAt(2) + clean.charAt(2), 16),
        ]
      : [
          parseInt(clean.slice(0, 2), 16),
          parseInt(clean.slice(2, 4), 16),
          parseInt(clean.slice(4, 6), 16),
        ];

  return [r, g, b, alpha];
};

// Computes where a CSS `object-fit`-sized element's content actually renders within its own
// box, as a horizontal offset/width in percent of that box. `object-fit` only changes how the
// *content* fits inside an element's box, never the box itself - `object-contain` can letterbox
// it smaller (see TryOnUploadStage.tsx), `object-cover` can crop it larger (see
// TryOnLiveStage.tsx) - so naive box-relative positioning (e.g. an overlay driven by plain
// percentages of the box) can end up visibly misaligned with what's actually drawn. Handles
// every standard `object-fit` value, not just contain/cover, so a future category's stage
// canvas can use any of them without this silently going wrong again. Assumes the default
// centered `object-position: 50% 50%` - every current/planned category's stage centers its
// subject, so this isn't expected to need generalizing further; used by
// TryOnCompareSlider.tsx to line its drag handle up with `FaceLandmarkerEngineBase.renderFrame`'s split.
export const getObjectFitContentRect = (
  boxWidth: number,
  boxHeight: number,
  contentWidth: number,
  contentHeight: number,
  objectFit: string,
): IObjectFitContentRect => {
  if (!boxWidth || !boxHeight || !contentWidth || !contentHeight) {
    return { leftPercent: 0, widthPercent: 100 };
  }

  const scale = getObjectFitScale(boxWidth, boxHeight, contentWidth, contentHeight, objectFit);
  const renderedWidth = contentWidth * scale;
  const offsetX = (boxWidth - renderedWidth) / 2;

  return {
    leftPercent: (offsetX / boxWidth) * 100,
    widthPercent: (renderedWidth / boxWidth) * 100,
  };
};

// Abort-aware image loader - used for both texture assets (once, at engine start) and
// user-uploaded photos (on demand, re-abortable if the user picks another photo mid-load).
export const loadImage = (src: string, signal?: AbortSignal): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('Aborted', 'AbortError'));
      return;
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';

    const cleanup = () => {
      img.onload = null;
      img.onerror = null;
      signal?.removeEventListener('abort', onAbort);
    };

    const onAbort = () => {
      cleanup();
      img.src = '';
      reject(new DOMException('Aborted', 'AbortError'));
    };

    signal?.addEventListener('abort', onAbort);

    img.onload = () => {
      cleanup();
      resolve(img);
    };

    img.onerror = () => {
      cleanup();
      reject(new Error(`Failed to load image: ${src}`));
    };

    img.src = src;
  });
};

export const toColorString = (r: number, g: number, b: number, a: number) => {
  return `rgba(${String(r)},${String(g)},${String(b)},${String(a)})`;
};

// The exact "lazily create once, cache per running mode, race against an abort signal" shape that
// `FaceLandmarkerCache.ts`/`HairSegmenterCache.ts`/`HandLandmarkerCache.ts` each hand-wrote
// identically (confirmed line-for-line identical, not just similar) - only *what* gets created
// ever differed between them. Factored out once here instead of continuing to triplicate it a
// fourth time were a 4th tracking model ever added - each Cache file now just supplies its own
// `createModel` (the part that's genuinely bespoke per model) and gets the memoization/abort-race
// machinery for free.
//
// Kept per running mode *and per address* of the model and of the WebAssembly (the `assets` option
// of the modal): a landmarker made from one address is not handed to a caller that asked for
// another.
export const createSharedModelCache = <TModel>(
  modelPath: string,
  createModel: (
    canvas: HTMLCanvasElement,
    mode: TRunningMode,
    urls: ITryOnModelUrls,
  ) => Promise<TModel>,
) => {
  const promises = new Map<string, Promise<TModel>>();

  return (
    canvas: HTMLCanvasElement,
    mode: TRunningMode,
    assets?: ITryOnAssets,
    signal?: AbortSignal,
  ): Promise<TModel> => {
    if (signal?.aborted) return Promise.reject(new DOMException('Aborted', 'AbortError'));

    const urls: ITryOnModelUrls = {
      modelUrl: resolveTryOnAssetUrl(modelPath, assets),
      wasmBaseUrl: resolveTryOnWasmBaseUrl(assets),
    };
    const key = `${String(mode)}|${urls.modelUrl}|${urls.wasmBaseUrl}`;

    let promise = promises.get(key);

    if (!promise) {
      promise = createModel(canvas, mode, urls).catch((err: unknown) => {
        // Creation failed - drop the cache entry so the next caller retries instead of being
        // stuck with a permanently-rejected cached promise.
        promises.delete(key);
        throw err;
      });
      promises.set(key, promise);
    }

    if (!signal) return promise;

    return Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        signal.addEventListener('abort', () => {
          reject(new DOMException('Aborted', 'AbortError'));
        });
      }),
    ]);
  };
};

// The before/after compare-slider draw - confirmed byte-for-byte identical across
// `FaceLandmarkerEngineBase`/`HairSegmenterEngineBase`/`HandLandmarkerEngineBase`'s own
// `renderFrame` methods, since none of it reads anything detector-specific: just `ctx`, the
// canvas dimensions, `comparePosition`/`isMirrored`, and an already-closed-over `applyEffect`
// callback that each category's own `renderFrame` builds locally (with whatever category-specific
// params - `face`/`mask`/`hands` - it needs).
//
// Owns the outer `ctx.restore()` that pairs with the caller's own mirror-transform `ctx.save()`
// (called once, before this) in *both* branches - `comparePosition === null` just applies the
// effect and restores; otherwise it clips to one side of the split, applies the effect there, and
// draws the divider line/glow in a separate, unmirrored screen-space save/restore pair (drawn
// after unwinding the mirror transform, so the divider itself never appears mirrored).
export const renderCompareSlider = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  comparePosition: number | null,
  isMirrored: boolean,
  applyEffect: () => void,
): void => {
  // ===== NORMAL MODE (NO SPLIT) =====
  if (comparePosition === null) {
    applyEffect();
    ctx.restore();
    return;
  }

  // ===== COMPARE-SLIDER SPLIT MODE =====
  const screenSplit = width * comparePosition;
  const drawingSplit = isMirrored ? width - screenSplit : screenSplit;

  ctx.save();
  ctx.beginPath();

  if (isMirrored) {
    // Mirror active: clip LEFT drawing space -> becomes RIGHT on screen.
    ctx.rect(0, 0, drawingSplit, height);
  } else {
    ctx.rect(drawingSplit, 0, width - drawingSplit, height);
  }

  ctx.clip();
  applyEffect();

  ctx.restore(); // restore clip
  ctx.restore(); // restore mirror transform

  // ===== DIVIDER (SCREEN SPACE) =====
  ctx.save();

  ctx.beginPath();
  ctx.moveTo(screenSplit, 0);
  ctx.lineTo(screenSplit, height);
  ctx.strokeStyle = 'rgba(0,0,0,0.25)';
  ctx.lineWidth = 3;
  ctx.stroke();

  const spread = 6;
  const gradient = ctx.createLinearGradient(screenSplit - spread, 0, screenSplit + spread, 0);
  gradient.addColorStop(0, 'rgba(255,255,255,0)');
  gradient.addColorStop(0.35, 'rgba(255,255,255,0.7)');
  gradient.addColorStop(0.5, 'rgba(255,255,255,1)');
  gradient.addColorStop(0.65, 'rgba(255,255,255,0.7)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');

  ctx.beginPath();
  ctx.moveTo(screenSplit, 0);
  ctx.lineTo(screenSplit, height);
  ctx.strokeStyle = gradient;
  ctx.lineWidth = 2;
  ctx.shadowColor = 'rgba(255,255,255,0.9)';
  ctx.shadowBlur = 10;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;
  ctx.stroke();

  ctx.restore();
};
