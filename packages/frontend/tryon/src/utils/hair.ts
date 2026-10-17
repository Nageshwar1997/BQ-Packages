import type { IHairMask, IHairRenderParams } from '../types/hair.js';
import type { TDetectionStatus, TDimension, TRGBTuple } from '../types/index.js';
import { createOffscreenCtx, toColorString } from './index.js';

// HAIR's own rendering primitives - fresh design (no reference implementation covers hair
// recolor at all, see docs/tryons/HAIR-PLAN.md's Research section), built on a per-pixel
// confidence mask (`IHairMask`) instead of a landmark ring, unlike every LIP/EYE/FACE primitive
// in this folder.

/* ================= DETECTION ================================================================
 * HAIR's own counterpart to `getFaceDetectionStatus` (utils/tryon-utils/index.ts) - purely
 * mask-confidence based (no landmark positions to read at all), reusing the same
 * `TDetectionStatus` type/`detectionStatus` field (`IMakeupBaseState`) every category's state
 * already carries, just repurposed to mean "hair region confidently detected" here. Only ever
 * produces 'detected'/'not-in-frame' - HAIR has no notion of a "turned" pose (that's specifically
 * a FACE full-face-fill problem, see `isFaceTurnedTooMuch`) or a "not-clear" partial reading, same
 * "a category only ever reports the status values its own rendering actually needs" precedent
 * BROWGEL/LIP/EYE already set for 'turned'.
 */

// How confident the segmenter has to be that a given pixel is hair before it counts toward
// coverage below - real model output is a smooth 0-1 gradient at hair edges, not a hard
// boundary, so this is a threshold on that gradient, not an exact "is/isn't" read.
const HAIR_DETECTION_CONFIDENCE_THRESHOLD = 0.5;
// How much of the frame has to read as hair (at the threshold above) before this counts as
// "detected" - deliberately low. Real on-frame hair (any length/style) almost always covers far
// more of the frame than this; the point is only to catch "no hair visible at all" (camera
// pointed away, completely out of frame), not to set a realistic minimum hairstyle size - unlike
// a face's bounding box, that varies far too much (buzzcut vs. long hair) to gate on confidently.
// Expected to get visually tuned once rendering, same as every approximate constant in this app.
const HAIR_MIN_COVERAGE_RATIO = 0.03;

export const getHairDetectionStatus = (mask: IHairMask | null): TDetectionStatus => {
  if (!mask || mask.data.length === 0) return 'not-in-frame';

  let hairPixels = 0;
  for (const confidence of mask.data) {
    if (confidence >= HAIR_DETECTION_CONFIDENCE_THRESHOLD) hairPixels++;
  }

  return hairPixels / mask.data.length >= HAIR_MIN_COVERAGE_RATIO ? 'detected' : 'not-in-frame';
};

/* ================= RECOLOR (COLOR / HENNA / OMBRE / HIGHLIGHTS share this) ====================
 * A confidence mask only says "is this pixel hair", never "which strand, or its own direction" -
 * there's no per-strand structure to exploit, so every HAIR finish built on real segmentation
 * data (as opposed to a procedural pattern layered on top, see HIGHLIGHTS in HAIR-PLAN.md) comes
 * down to the same operation: recolor the masked region while preserving the frame's own
 * per-pixel luminance (so strand-level shine/shadow stays visible through the new color, instead
 * of flattening into one solid patch - a flat alpha fill, the technique every LIP/FACE finish
 * uses, would do exactly that here).
 */

// Builds a flat-white, alpha-only layer at the mask's own native resolution (the segmenter's own
// output size, not necessarily the render canvas's `dimension`) - the only per-pixel JS loop in
// this whole primitive, deliberately kept at the mask's own (much smaller) resolution rather than
// upsampled by hand. `drawImage` in `applyHairMaskRecolor` below does the actual upscale to
// `dimension`, letting the browser's own (GPU-accelerated) image scaling handle that instead of a
// manual per-canvas-pixel resample loop - important for Live mode, where this runs every frame
// (see docs/tryons/HAIR-PLAN.md's Open question 2 on Live-mode performance).
//
// `alphaMultiplier`, when non-`null`, is a per-pixel 0-1 factor (same length/row-major order as
// `mask.data` itself) that scales that exact pixel's alpha before writing it, on top of the
// mask's own per-pixel confidence there - OMBRE's root-to-tip fade and HIGHLIGHTS's streak pattern
// (both below) are the only callers that pass one, each building it differently (a value that
// only varies by row, or only by column) but landing on this same full-size shape so this
// function itself never needs to know which; COLOR/HENNA pass `null` explicitly, leaving every
// pixel at its full mask confidence. A required (not optional) param deliberately - every call
// site has to say explicitly whether it wants a multiplier or not, rather than letting "no
// multiplier" be an easy-to-miss omitted argument.
const buildMaskAlphaLayer = (
  mask: IHairMask,
  alphaMultiplier: Float32Array | null,
): HTMLCanvasElement | null => {
  const maskCanvas = document.createElement('canvas');
  maskCanvas.width = mask.width;
  maskCanvas.height = mask.height;
  const maskCtx = maskCanvas.getContext('2d');
  if (!maskCtx) return null;

  const imageData = maskCtx.createImageData(mask.width, mask.height);
  mask.data.forEach((confidence, i) => {
    const multiplier = alphaMultiplier ? (alphaMultiplier[i] ?? 1) : 1;
    const offset = i * 4;
    imageData.data[offset] = 255;
    imageData.data[offset + 1] = 255;
    imageData.data[offset + 2] = 255;
    imageData.data[offset + 3] = Math.round(confidence * multiplier * 255);
  });
  maskCtx.putImageData(imageData, 0, 0);

  return maskCanvas;
};

// `globalCompositeOperation: 'color'` alone has a real, empirically-confirmed failure mode at
// luminosity extremes: the CSS/Canvas 'color' blend formula (`SetLum(sourceHue, destLum)`) clips
// to black when the destination pixel is already pure black (luminosity 0) or to white when pure
// white (luminosity 1) - the source's own hue has nowhere to show through at those two exact
// points, no matter the alpha. Confirmed directly, not assumed: compositing a vivid target color
// onto a pure-black destination at full alpha left the destination completely unchanged, `(0,0,0)`
// in, `(0,0,0)` out - reported against a real, genuinely dark (near-black) natural hair color on a
// real device, where enough pixels sit close enough to that extreme for the recolor to read as
// barely applied. `COLOR_FLOOR_ALPHA_RATIO` (used in `applyHairMaskRecolor` below) fixes this with
// a second, low-alpha flat `source-over` pass on the exact same masked region - `source-over`
// always blends visibly regardless of the destination's own luminosity (as long as alpha > 0), so
// it guarantees a floor of visible color exactly where the `'color'` blend alone can silently
// contribute nothing, while that primary `'color'` pass still does all the real work of preserving
// natural strand shine/shadow for the vast majority of non-extreme pixels.
const COLOR_FLOOR_ALPHA_RATIO = 0.25;

// Draws `mask`'s hair region as a `rgb` recolor over the already-drawn base frame on `ctx`.
// `globalCompositeOperation: 'color'` (hue + saturation from the source layer below, luminosity
// from `ctx`'s own already-drawn frame) is used instead of a plain alpha fill deliberately - see
// this file's own top comment and docs/tryons/HAIR-PLAN.md's Research section for why a flat fill
// would flatten every strand's own shading into one solid patch here, unlike a landmark-region
// fill where that's not a visible problem.
const applyHairMaskRecolor = (
  ctx: CanvasRenderingContext2D,
  mask: IHairMask,
  rgb: TRGBTuple,
  dimension: TDimension,
  alpha: number,
  alphaMultiplier: Float32Array | null,
) => {
  const maskCanvas = buildMaskAlphaLayer(mask, alphaMultiplier);
  if (!maskCanvas) return;

  // A flat rect of the target color at the render canvas's own size, punched down to just the
  // hair region by the (GPU-upscaled) mask layer above via `destination-in` - same "build on an
  // off-screen canvas, composite once" shape as `fillFaceOvalRegion` (utils/tryon-utils/face.ts).
  const colorCtx = createOffscreenCtx(dimension);
  if (!colorCtx) return;

  const [r, g, b] = rgb;
  colorCtx.fillStyle = toColorString(r, g, b, 1);
  colorCtx.fillRect(0, 0, dimension.width, dimension.height);
  colorCtx.globalCompositeOperation = 'destination-in';
  colorCtx.drawImage(
    maskCanvas,
    0,
    0,
    mask.width,
    mask.height,
    0,
    0,
    dimension.width,
    dimension.height,
  );

  // Composite the masked color layer onto the already-drawn base frame - `alpha` (the intensity
  // slider) is applied here via `globalAlpha`, not baked into the mask layer above, since
  // `globalCompositeOperation`+`globalAlpha` compose correctly together as one draw call.
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.globalCompositeOperation = 'color';
  ctx.drawImage(colorCtx.canvas, 0, 0);
  ctx.restore();

  // See `COLOR_FLOOR_ALPHA_RATIO`'s own comment - the exact same masked color layer, drawn again
  // with a plain `source-over` blend at a reduced alpha, so a near-black or near-white hair pixel
  // (where the `'color'` pass above can silently contribute zero visible change) still gets a
  // visible floor of the chosen color.
  ctx.save();
  ctx.globalAlpha = alpha * COLOR_FLOOR_ALPHA_RATIO;
  ctx.globalCompositeOperation = 'source-over';
  ctx.drawImage(colorCtx.canvas, 0, 0);
  ctx.restore();
};

export const applyColorHair = ({ ctx, mask, rgb, dimension, alpha }: IHairRenderParams) => {
  applyHairMaskRecolor(ctx, mask, rgb, dimension, alpha, null);
};

// HENNA reuses COLOR's exact mechanism, no separate color-math transform - real henna products
// come in their own distinct shades (Natural/Red/Burgundy/Black henna etc.), same as any other
// HAIR product, so the "reddish-brown" character comes from *which* shade the shopper picks (real
// catalog data, same as every other finish in this app), not from a hardcoded hue baked into the
// render. Still its own named export - same "every finish gets its own wrapper, even a thin one"
// convention `applyBrowgelEye` (utils/tryon-utils/eye.ts) already set for EYEBROW's fill
// primitive - so a future divergence (if HENNA ever needs its own texture/warmth treatment) has
// an obvious place to land without touching COLOR's own callers.
export const applyHennaHair = applyColorHair;

/* ================= EXTENT (shared by OMBRE + HIGHLIGHTS) =======================================
 * Both OMBRE's root-to-tip ramp and HIGHLIGHTS's streak pattern below need to anchor themselves to
 * where the hair actually *is* in the frame - the raw 0..width/0..height mask range would mostly
 * be background for a typical headshot. Both derive that from the mask's own confident-hair
 * pixels, just along different axes.
 */

// A lower bar than `HAIR_DETECTION_CONFIDENCE_THRESHOLD` on purpose - this only decides "does this
// row/column count as part of the hair's own extent at all" (for anchoring a gradient/pattern),
// not "should this exact pixel be recolored" (the mask's own per-pixel confidence, multiplied in
// afterwards via `buildMaskAlphaLayer`, still handles that).
const HAIR_EXTENT_CONFIDENCE_THRESHOLD = 0.3;

const findHairVerticalExtent = (mask: IHairMask): { minRow: number; maxRow: number } => {
  let minRow = mask.height;
  let maxRow = -1;

  mask.data.forEach((confidence, i) => {
    if (confidence < HAIR_EXTENT_CONFIDENCE_THRESHOLD) return;
    const row = Math.floor(i / mask.width);
    if (row < minRow) minRow = row;
    if (row > maxRow) maxRow = row;
  });

  // No row met the threshold - shouldn't happen once `getHairDetectionStatus` has already gated
  // on 'detected', but keeps this safe to call standalone. Falls back to the mask's own full
  // height so the caller still spans something sensible instead of dividing by a zero-length
  // range.
  return maxRow < minRow ? { minRow: 0, maxRow: mask.height - 1 } : { minRow, maxRow };
};

const findHairHorizontalExtent = (mask: IHairMask): { minCol: number; maxCol: number } => {
  let minCol = mask.width;
  let maxCol = -1;

  mask.data.forEach((confidence, i) => {
    if (confidence < HAIR_EXTENT_CONFIDENCE_THRESHOLD) return;
    const col = i % mask.width;
    if (col < minCol) minCol = col;
    if (col > maxCol) maxCol = col;
  });

  return maxCol < minCol ? { minCol: 0, maxCol: mask.width - 1 } : { minCol, maxCol };
};

/* ================= OMBRE (root-to-tip gradient) ================================================
 * Real ombre hair keeps the roots close to their natural color and only gradually recolors toward
 * the tips - COLOR's own full-mask recolor would flatten that into one uniform color end to end.
 * This reuses the exact same mask + `destination-in` + blend mechanism as COLOR/HENNA, it just
 * multiplies each pixel's own mask alpha by an extra root(0)-to-tip(1) ramp first (constant across
 * a row, varying only by which row), anchored to the mask's own vertical extent above - not the
 * raw 0..height range, since a headshot rarely fills the frame top-to-bottom, and anchoring to the
 * actual hair bounding box is what makes the "root" end of the ramp land on the actual visible
 * roots.
 */

const buildRootToTipAlphaMultiplier = (mask: IHairMask): Float32Array => {
  const { minRow, maxRow } = findHairVerticalExtent(mask);
  const span = maxRow - minRow;

  const multiplier = new Float32Array(mask.data.length);
  for (let row = 0; row < mask.height; row++) {
    // `span <= 0` (every confident row landed on one exact line - degenerate, e.g. an extreme
    // close-up crop) falls back to fully recolored rather than dividing by zero.
    const rowValue = span <= 0 ? 1 : Math.min(1, Math.max(0, (row - minRow) / span));
    const rowStart = row * mask.width;
    multiplier.fill(rowValue, rowStart, rowStart + mask.width);
  }
  return multiplier;
};

export const applyOmbreHair = ({ ctx, mask, rgb, dimension, alpha }: IHairRenderParams) => {
  applyHairMaskRecolor(ctx, mask, rgb, dimension, alpha, buildRootToTipAlphaMultiplier(mask));
};

/* ================= HIGHLIGHTS (procedural streak pattern) ======================================
 * A confidence mask has no per-strand structure to read a real highlight placement from (see this
 * file's own top comment) - the best available approximation is a procedural pattern of soft
 * vertical streaks layered on top of the same mask, so only *some* columns across the hair get
 * recolored rather than the whole thing. Full reasoning + honest ceiling on how close this gets to
 * a real balayage/foil-highlight look: docs/tryons/HAIR-PLAN.md's Subcategories section.
 *
 * Streak positions/widths come from a *fixed-seed* PRNG, never `Math.random()` - the same
 * "deterministic per-stroke jitter, not per-frame random" reasoning EYEBROW's own procedural
 * hair-stroke patterns already established (see docs/tryons/EYEBROW.md's Design notes). A
 * per-frame-random pattern would flicker to a new arrangement on every single render in Live mode;
 * a fixed seed means the exact same streaks land in the exact same place every time, for as long
 * as the mask's own width doesn't change.
 */

// A small, self-contained PRNG (mulberry32) - deterministic purely from its own seed, no
// dependency on `Math.random()`'s own global state. Good enough for placing a handful of streaks;
// this isn't cryptographic or statistical-quality randomness, just "looks scattered, not obviously
// patterned".
const createSeededRandom = (seed: number): (() => number) => {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

// Arbitrary fixed constant - deliberately never derived from the mask, timestamp, or anything
// else that could vary frame to frame (see this section's own top comment for why).
const HIGHLIGHTS_STREAK_SEED = 20260101;
const HIGHLIGHTS_STREAK_COUNT = 7;
// Each streak's own width is a random fraction of the hair's *detected horizontal extent*
// (`findHairHorizontalExtent`), not the whole mask width - narrow enough to read as individual
// streaks rather than a handful of wide color blocks covering most of the hair.
const HIGHLIGHTS_STREAK_WIDTH_RATIO_MIN = 0.04;
const HIGHLIGHTS_STREAK_WIDTH_RATIO_MAX = 0.09;

// One 0-1 "how much of a highlight streak lands on this column" value per mask column, built once
// from the fixed seed above. Soft (raised-cosine) falloff from each streak's own center, not a
// hard-edged band - same "soft, not sharp" preference every blob/wash primitive in this app
// already follows (`drawFeatheredBlob`, `fillFaceOvalRegion`'s own feathering). Overlapping
// streaks take the max, not the sum, so two streaks crossing near each other still tops out at a
// normal single-streak intensity instead of over-brightening.
const buildStreakColumnIntensity = (
  minCol: number,
  maxCol: number,
  width: number,
): Float32Array => {
  const random = createSeededRandom(HIGHLIGHTS_STREAK_SEED);
  const intensity = new Float32Array(width);
  const hairWidth = Math.max(1, maxCol - minCol);

  for (let s = 0; s < HIGHLIGHTS_STREAK_COUNT; s++) {
    const centerX = minCol + random() * hairWidth;
    const widthRatio =
      HIGHLIGHTS_STREAK_WIDTH_RATIO_MIN +
      random() * (HIGHLIGHTS_STREAK_WIDTH_RATIO_MAX - HIGHLIGHTS_STREAK_WIDTH_RATIO_MIN);
    const streakWidth = widthRatio * hairWidth;

    for (let x = 0; x < width; x++) {
      const distance = Math.abs(x - centerX);
      if (distance > streakWidth) continue;
      const falloff = 0.5 * (1 + Math.cos((distance / streakWidth) * Math.PI));
      intensity[x] = Math.max(intensity[x] ?? 0, falloff);
    }
  }

  return intensity;
};

const buildStreakAlphaMultiplier = (mask: IHairMask): Float32Array => {
  const { minCol, maxCol } = findHairHorizontalExtent(mask);
  const columnIntensity = buildStreakColumnIntensity(minCol, maxCol, mask.width);

  // Same column pattern repeated down every row - a highlight streak runs the visible length of
  // a strand, unlike OMBRE's root-to-tip fade which deliberately varies by row instead.
  const multiplier = new Float32Array(mask.data.length);
  for (let row = 0; row < mask.height; row++) {
    multiplier.set(columnIntensity, row * mask.width);
  }
  return multiplier;
};

export const applyHighlightsHair = ({ ctx, mask, rgb, dimension, alpha }: IHairRenderParams) => {
  applyHairMaskRecolor(ctx, mask, rgb, dimension, alpha, buildStreakAlphaMultiplier(mask));
};
