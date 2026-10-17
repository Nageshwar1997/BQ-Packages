import { TRY_ON_SUB_CATEGORY_MAP } from '@beautinique/frontend-constants';
import type { NormalizedLandmark } from '@mediapipe/tasks-vision';

import {
  LIP_OUTER_CONTOUR_INDICES,
  LIP_TEXTURE_COMPOSITE_OPERATION,
  LOWER_LIP_DOT_BLUR_AMOUNT,
  LOWER_LIP_INDICES,
  LOWER_WHITE_LIP_INDICES_INSET,
  UPPER_LIP_INDICES,
  UPPER_WHITE_LIP_INDICES_INSET,
} from '../constants/lip.js';
import type { TDimension, TPoint } from '../types/index.js';
import type {
  ILipDoubleTextureRenderParams,
  ILipRenderParams,
  ILipSingleTextureRenderParams,
  TLipFinish,
} from '../types/lip.js';
import { createOffscreenCtx } from './index.js';

// LIP-specific canvas rendering, ported from the reference implementation's
// `virtual-tryon/utils/index.ts` lip functions. The per-finish opacity numbers below (0.1,
// 0.3, 0.6, 0.7, 0.9, ...) are hand-tuned visual constants from that reference, not derived
// from anything - kept exactly as they were rather than "cleaned up" into a shared config,
// since collapsing them risks silently changing the tuned look. What *is* safely deduplicated
// is the outer orchestration (temp-canvas compositing + blurred dot-highlight pass), which was
// byte-for-byte identical across gloss/crayon/shimmer in the reference.

const isBrightColor = (r: number, g: number, b: number) => {
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return luminance > 128;
};

const fillColor = (ctx: CanvasRenderingContext2D, color: string, alpha: number) => {
  ctx.fillStyle = color;
  ctx.globalAlpha = alpha;
  ctx.fill();
};

const midpoint = (a: TPoint, b: TPoint): TPoint => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });

// Traces a *smoothed* closed loop through a set of points - each point becomes a quadratic-
// curve control point, with the curve actually passing through the midpoint before/after it,
// rather than a sharp `lineTo` polygon corner at the point itself. Landmark rings this sparse
// (UPPER_LIP_INDICES etc. are a couple dozen points at most) read as a visibly faceted polygon
// with straight `lineTo` edges - this is what makes the lip shape itself look naturally rounded
// instead. Same technique `applyLipTexture` below already uses for its own overlay passes, just
// generalized here so every lip clip region (not just the texture overlays) gets it.
const traceSmoothClosedPath = (ctx: CanvasRenderingContext2D, points: TPoint[]) => {
  if (points.length < 3) return;

  const last = points[points.length - 1];
  const first = points[0];
  if (!last || !first) return;

  const start = midpoint(last, first);
  ctx.moveTo(start.x, start.y);

  points.forEach((point, i) => {
    const next = points[(i + 1) % points.length];
    if (!next) return;
    const mid = midpoint(point, next);
    ctx.quadraticCurveTo(point.x, point.y, mid.x, mid.y);
  });

  ctx.closePath();
};

const clipLipsOnFace = (
  canvasElement: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
  face: NormalizedLandmark[],
  indices: number[],
) => {
  // Same "fixed constant indices" reasoning as elsewhere in this file - `.filter` here is just
  // satisfying `noUncheckedIndexedAccess`, not expected to ever drop a point.
  const points = indices
    .map((index) => face[index])
    .filter((point): point is NormalizedLandmark => point !== undefined)
    .map((point) => ({ x: point.x * canvasElement.width, y: point.y * canvasElement.height }));

  ctx.beginPath();
  traceSmoothClosedPath(ctx, points);
  ctx.clip();
};

const applyLipFilters = (ctx: CanvasRenderingContext2D, dimension: TDimension, alpha: number) => {
  ctx.filter = 'contrast(1.1) saturate(1.1)';
  ctx.globalAlpha = alpha;
  ctx.fillRect(0, 0, dimension.width, dimension.height);
  ctx.filter = 'none';
};

// Clips to a lip-region ring, then paints a texture image into that clip with rounded
// (quadratic-curve-smoothed) corners rather than the sharp polygon `clipLipsOnFace` produces.
const applyLipTexture = (
  ctx: CanvasRenderingContext2D,
  face: NormalizedLandmark[],
  indices: number[],
  texture: HTMLImageElement,
  opacity: number,
) => {
  const padding = 5;
  // Same "fixed constant indices" reasoning as `clipLipsOnFace` above - `.filter` here is
  // just satisfying `noUncheckedIndexedAccess`, not expected to ever drop a point.
  const points = indices
    .map((index) => face[index])
    .filter((point): point is NormalizedLandmark => point !== undefined)
    .map((point) => ({ x: point.x * ctx.canvas.width, y: point.y * ctx.canvas.height }));

  const firstPoint = points[0];
  if (!firstPoint) return;

  ctx.save();
  ctx.beginPath();
  ctx.moveTo(firstPoint.x - padding, firstPoint.y - padding);

  points.forEach((point, i) => {
    if (i === 0) return;
    const prev = points[i - 1];
    if (!prev) return;

    const cpX = (prev.x + point.x) / 2;
    const cpY = (prev.y + point.y) / 2;
    ctx.quadraticCurveTo(prev.x, prev.y, cpX, cpY);
  });

  const last = points[points.length - 1];
  if (!last) {
    ctx.restore();
    return;
  }

  ctx.quadraticCurveTo(last.x, last.y, firstPoint.x - padding, firstPoint.y - padding);
  ctx.closePath();
  ctx.clip();

  const minX = Math.min(...points.map((p) => p.x));
  const minY = Math.min(...points.map((p) => p.y));
  const maxX = Math.max(...points.map((p) => p.x));
  const maxY = Math.max(...points.map((p) => p.y));

  ctx.globalAlpha = opacity;
  ctx.drawImage(texture, minX, minY, maxX - minX, maxY - minY);
  ctx.restore();
};

const parseRGB = (color: string): [number, number, number] | null => {
  const match = /rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/.exec(color);
  if (!match) return null;
  return [Number(match[1]), Number(match[2]), Number(match[3])];
};

/* ================= MATTE ================= */

const drawLipHalfMatte = (
  canvasElement: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
  face: NormalizedLandmark[],
  indices: number[],
  color: string,
  alpha: number,
) => {
  ctx.save();
  clipLipsOnFace(canvasElement, ctx, face, indices);
  fillColor(ctx, color, alpha);
  ctx.restore();
};

export const applyMatteLips = ({ face, ctx, color, dimension, alpha }: ILipRenderParams) => {
  const tempCtx = createOffscreenCtx(dimension);
  if (!tempCtx) return;
  const temp = tempCtx.canvas;

  drawLipHalfMatte(temp, tempCtx, face, UPPER_LIP_INDICES, color, alpha);
  drawLipHalfMatte(temp, tempCtx, face, LOWER_LIP_INDICES, color, alpha);

  ctx.globalCompositeOperation = 'source-over';
  ctx.drawImage(temp, 0, 0);
};

/* ================= LINER ================= */
// The only finish that isn't a fill - a liner traces the lip's outer border rather than
// covering its interior, so it needs its own stroke-based primitive instead of reusing
// `clipLipsOnFace`'s fill-region approach.

// Traces a closed path through both index arrays as two separate sub-paths of one `Path2D`-
// style call - since `UPPER_LIP_INDICES`/`LOWER_LIP_INDICES` are each already a closed fill
// region, clipping to *both* (rather than intersecting them, which `clipLipsOnFace` calling
// `ctx.clip()` twice would do) needs them drawn into one path so the clip covers their union.
const clipToFullLipFill = (
  ctx: CanvasRenderingContext2D,
  face: NormalizedLandmark[],
  dimension: TDimension,
) => {
  ctx.beginPath();
  [UPPER_LIP_INDICES, LOWER_LIP_INDICES].forEach((indices) => {
    const points = indices
      .map((index) => face[index])
      .filter((point): point is NormalizedLandmark => point !== undefined)
      .map((point) => ({ x: point.x * dimension.width, y: point.y * dimension.height }));
    traceSmoothClosedPath(ctx, points);
  });
  ctx.clip();
};

// A real liner reads as hard/defined right at the lip's outer edge (against skin) and softens
// as it moves inward (toward the lipstick/fill) - not a uniform-width, uniform-opacity line.
// Achieved by stroking `LIP_OUTER_CONTOUR_INDICES` wide and blurred (so the stroke bleeds on
// both sides of that boundary), then clipping to the lip's own fill region: `ctx.clip()` is
// always hard-edged regardless of what's drawn inside it, so the half of the blurred stroke
// bleeding outward (onto skin) gets cut off crisply right at the boundary, while the half
// bleeding inward (into the lip) stays and shows the blur's natural soft falloff.
export const applyLinerLips = ({ face, ctx, color, dimension, alpha }: ILipRenderParams) => {
  const points = LIP_OUTER_CONTOUR_INDICES.map((index) => face[index])
    .filter((point): point is NormalizedLandmark => point !== undefined)
    .map((point) => ({ x: point.x * dimension.width, y: point.y * dimension.height }));

  const firstPoint = points[0];
  if (!firstPoint) return;

  // Scaled off the traced contour's own measured width rather than the full canvas/dimension -
  // a close-up crop and a full-body photo can have wildly different canvas sizes for the same
  // real-world lip size, but the contour's own bounding box stays proportional to the lips
  // either way. Only the inward half of this ends up visible (the outward half gets clipped
  // away below), so this is deliberately wider than a plain uniform-width line would need.
  const xs = points.map((point) => point.x);
  const contourWidth = Math.max(...xs) - Math.min(...xs);
  const lineWidth = Math.max(3, contourWidth * 0.1);
  const blurAmount = lineWidth * 0.35;

  const tempCtx = createOffscreenCtx(dimension);
  if (!tempCtx) return;

  tempCtx.save();
  clipToFullLipFill(tempCtx, face, dimension);

  tempCtx.beginPath();
  tempCtx.moveTo(firstPoint.x, firstPoint.y);
  points.slice(1).forEach((point) => {
    tempCtx.lineTo(point.x, point.y);
  });
  tempCtx.closePath();

  tempCtx.filter = `blur(${String(blurAmount)}px)`;
  tempCtx.strokeStyle = color;
  tempCtx.lineWidth = lineWidth;
  tempCtx.lineJoin = 'round';
  tempCtx.globalAlpha = alpha;
  tempCtx.stroke();
  tempCtx.restore();

  ctx.globalCompositeOperation = 'source-over';
  ctx.drawImage(tempCtx.canvas, 0, 0);
};

/* ================= TEXTURED FINISHES (gloss / crayon / shimmer) ================= */

// One entry per finish's hand-tuned opacities - see the file-level note on why these numbers
// aren't further "simplified".
interface ITexturedFinishTuning {
  baseAlphaUpper: number;
  baseAlphaLower: number;
  brightOpacity: number;
  darkPrimaryOpacity: number;
  darkInsetOpacityUpper: number;
  darkInsetOpacityLower: number;
  applyFilters: boolean;
}

// Exported for `lip.test.ts` only - nothing outside this file needs it at runtime,
// `applyTexturedLips` below already closes over it directly.
//
// The keys of this table are the one place that says which finishes are drawn with a texture: the type
// of `applyTexturedLips`'s `finish` is taken from it (`keyof typeof`), so there is no second list to
// keep. `satisfies` only lets a key be a finish of LIP, each with a complete entry (a finish of another
// category, or a missing number, is a compile error).
export const TEXTURED_FINISH_TUNING = {
  [TRY_ON_SUB_CATEGORY_MAP.GLOSS]: {
    baseAlphaUpper: 0.6,
    baseAlphaLower: 0.4,
    brightOpacity: 0.3,
    darkPrimaryOpacity: 0.1,
    darkInsetOpacityUpper: 0.3,
    darkInsetOpacityLower: 0.3,
    applyFilters: true,
  },
  [TRY_ON_SUB_CATEGORY_MAP.CRAYON]: {
    // Crayon fills with the caller's own alpha (waxy, more opaque than gloss) rather than a
    // fixed base, and skips the final saturating filter pass (matte-ish finish, no shine boost).
    baseAlphaUpper: -1, // sentinel: use the passed-in `alpha` instead
    baseAlphaLower: -1,
    brightOpacity: 0.1,
    darkPrimaryOpacity: 0.1,
    darkInsetOpacityUpper: 0.2,
    darkInsetOpacityLower: 0.2,
    applyFilters: false,
  },
  [TRY_ON_SUB_CATEGORY_MAP.SHIMMER]: {
    baseAlphaUpper: 0.4,
    baseAlphaLower: 0.4,
    brightOpacity: 0.7,
    darkPrimaryOpacity: 0.7,
    darkInsetOpacityUpper: 0.9,
    darkInsetOpacityLower: 0.9,
    applyFilters: true,
  },
  // Same shape as GLOSS's tuning - the blurred oil-u/oil-l textures (see
  // OIL_TEXTURE_PATH_UPPER/_LOWER) already carry the "softer, more spread-out" difference, so
  // only a slightly higher base alpha is added here for a wetter, more saturated-looking sheen.
  [TRY_ON_SUB_CATEGORY_MAP.OIL]: {
    baseAlphaUpper: 0.65,
    baseAlphaLower: 0.5,
    brightOpacity: 0.3,
    darkPrimaryOpacity: 0.1,
    darkInsetOpacityUpper: 0.3,
    darkInsetOpacityLower: 0.3,
    applyFilters: true,
  },
  // Higher across the board than GLOSS - the metallic-u/metallic-l textures already bake in a
  // sharper highlight core plus a flake-sparkle layer (see METALLIC_TEXTURE_PATH_UPPER/_LOWER),
  // and a more opaque/higher-contrast fill here makes that flake texture actually read as
  // reflective foil rather than getting lost under GLOSS-level opacity.
  [TRY_ON_SUB_CATEGORY_MAP.METALLIC]: {
    baseAlphaUpper: 0.7,
    baseAlphaLower: 0.55,
    brightOpacity: 0.5,
    darkPrimaryOpacity: 0.3,
    darkInsetOpacityUpper: 0.5,
    darkInsetOpacityLower: 0.5,
    applyFilters: true,
  },
  // Uses the same shared texture as GLOSS (see
  // GLOSS_OR_SATIN_OR_BALM_OR_PLUMPER_TEXTURE_PATH_UPPER/_LOWER - no dedicated art yet),
  // differentiated purely by a lower base alpha: a dewy "plumped" shine sitting between BALM's
  // sheer wash (GLOSS's own tuning at a caller-side alpha*0.5) and GLOSS's full shine.
  // Everything else matches GLOSS's tuning - only the base intensity was the original design
  // intent here.
  [TRY_ON_SUB_CATEGORY_MAP.PLUMPER]: {
    baseAlphaUpper: 0.5,
    baseAlphaLower: 0.35,
    brightOpacity: 0.3,
    darkPrimaryOpacity: 0.1,
    darkInsetOpacityUpper: 0.3,
    darkInsetOpacityLower: 0.3,
    applyFilters: true,
  },
} satisfies Partial<Record<TLipFinish, ITexturedFinishTuning>>;

const drawLipHalfTextured = (
  canvasElement: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
  face: NormalizedLandmark[],
  indices: number[],
  insetIndices: number[],
  color: string,
  texture: HTMLImageElement,
  dimension: TDimension,
  alpha: number,
  baseAlpha: number,
  brightOpacity: number,
  darkPrimaryOpacity: number,
  darkInsetOpacity: number,
  applyFilters: boolean,
) => {
  ctx.save();
  clipLipsOnFace(canvasElement, ctx, face, indices);
  fillColor(ctx, color, baseAlpha === -1 ? alpha : baseAlpha);

  const rgb = parseRGB(color);
  if (!rgb) {
    console.warn('Invalid lip color format:', color);
    ctx.restore();
    return;
  }

  if (isBrightColor(...rgb)) {
    applyLipTexture(ctx, face, indices, texture, brightOpacity);
  } else {
    applyLipTexture(ctx, face, indices, texture, darkPrimaryOpacity);
    applyLipTexture(ctx, face, insetIndices, texture, darkInsetOpacity);
  }

  if (applyFilters) applyLipFilters(ctx, dimension, alpha);
  ctx.restore();
};

// Shared by GLOSS/CRAYON/SHIMMER - the reference had this exact orchestration (temp-canvas
// composite + blurred "dot" highlight pass) copy-pasted three times with only the tuning
// numbers differing; that part is safe to collapse since it never touches the tuned constants.
const applyTexturedLips = (
  finish: keyof typeof TEXTURED_FINISH_TUNING,
  face: NormalizedLandmark[],
  ctx: CanvasRenderingContext2D,
  color: string,
  textureUpper: HTMLImageElement,
  textureLower: HTMLImageElement,
  dimension: TDimension,
  alpha: number,
) => {
  const t = TEXTURED_FINISH_TUNING[finish];

  const tempCtx = createOffscreenCtx(dimension);
  if (!tempCtx) return;
  const temp = tempCtx.canvas;

  drawLipHalfTextured(
    temp,
    tempCtx,
    face,
    UPPER_LIP_INDICES,
    UPPER_WHITE_LIP_INDICES_INSET,
    color,
    textureUpper,
    dimension,
    alpha,
    t.baseAlphaUpper,
    t.brightOpacity,
    t.darkPrimaryOpacity,
    t.darkInsetOpacityUpper,
    t.applyFilters,
  );
  drawLipHalfTextured(
    temp,
    tempCtx,
    face,
    LOWER_LIP_INDICES,
    LOWER_WHITE_LIP_INDICES_INSET,
    color,
    textureLower,
    dimension,
    alpha,
    t.baseAlphaLower,
    t.brightOpacity,
    t.darkPrimaryOpacity,
    t.darkInsetOpacityLower,
    t.applyFilters,
  );

  ctx.globalCompositeOperation = LIP_TEXTURE_COMPOSITE_OPERATION;
  ctx.drawImage(temp, 0, 0);

  // Soft blurred "dot" highlight, composited on top of the textured fill.
  const lowerDotCtx = createOffscreenCtx(dimension);
  const upperDotCtx = createOffscreenCtx(dimension);
  if (!lowerDotCtx || !upperDotCtx) return;
  const lowerDot = lowerDotCtx.canvas;
  const upperDot = upperDotCtx.canvas;

  clipLipsOnFace(lowerDot, lowerDotCtx, face, LOWER_LIP_INDICES);
  lowerDotCtx.filter = `blur(${String(LOWER_LIP_DOT_BLUR_AMOUNT)}px)`;

  clipLipsOnFace(upperDot, upperDotCtx, face, UPPER_LIP_INDICES);
  upperDotCtx.filter = `blur(${String(LOWER_LIP_DOT_BLUR_AMOUNT)}px)`;

  ctx.globalAlpha = 0.8;
  ctx.globalCompositeOperation = 'source-over';
  ctx.drawImage(lowerDot, 0, 0);
  ctx.drawImage(upperDot, 0, 0);
  ctx.globalCompositeOperation = 'source-over';
};

export const applyGlossLips = ({
  face,
  ctx,
  color,
  textureUpper,
  textureLower,
  dimension,
  alpha,
}: ILipDoubleTextureRenderParams) => {
  applyTexturedLips(
    TRY_ON_SUB_CATEGORY_MAP.GLOSS,
    face,
    ctx,
    color,
    textureUpper,
    textureLower,
    dimension,
    alpha,
  );
};

export const applyCrayonLips = ({
  face,
  ctx,
  color,
  texture,
  dimension,
  alpha,
}: ILipSingleTextureRenderParams) => {
  // Crayon uses one texture file for both halves (see constants/tryon-constants/lip.ts).
  applyTexturedLips(
    TRY_ON_SUB_CATEGORY_MAP.CRAYON,
    face,
    ctx,
    color,
    texture,
    texture,
    dimension,
    alpha,
  );
};

export const applyShimmerLips = ({
  face,
  ctx,
  color,
  texture,
  dimension,
  alpha,
}: ILipSingleTextureRenderParams) => {
  // Shimmer also uses one texture file for both halves.
  applyTexturedLips(
    TRY_ON_SUB_CATEGORY_MAP.SHIMMER,
    face,
    ctx,
    color,
    texture,
    texture,
    dimension,
    alpha,
  );
};

// Sharp, foil-like reflective finish - the metallic-u/metallic-l textures already bake in both
// a harder highlight core and a flake-sparkle layer (see METALLIC_TEXTURE_PATH_UPPER/_LOWER),
// so this needs no extra runtime compositing beyond what GLOSS/SHIMMER already do - only the
// texture assets and METALLIC's own (punchier) tuning in TEXTURED_FINISH_TUNING differ.
export const applyMetallicLips = ({
  face,
  ctx,
  color,
  textureUpper,
  textureLower,
  dimension,
  alpha,
}: ILipDoubleTextureRenderParams) => {
  applyTexturedLips(
    TRY_ON_SUB_CATEGORY_MAP.METALLIC,
    face,
    ctx,
    color,
    textureUpper,
    textureLower,
    dimension,
    alpha,
  );
};

/* ================= APPROXIMATED FINISHES (SATIN / STAIN / BALM / OIL / PLUMPER) =============
 * The reference only demonstrates matte/gloss/crayon/shimmer - these five are new, genuinely
 * built on the same primitives above rather than invented pixel math, but the exact tuning is
 * ours (not ported from a validated source), so it's called out here plainly rather than
 * presented as equally battle-tested.
 */

// Matte base + a single light sheen pass - not a full gloss composite (no dot-highlight).
export const applySatinLips = ({
  face,
  ctx,
  color,
  textureUpper,
  textureLower,
  dimension,
  alpha,
}: ILipDoubleTextureRenderParams) => {
  applyMatteLips({ face, ctx, color, dimension, alpha });
  ctx.save();
  applyLipTexture(ctx, face, UPPER_LIP_INDICES, textureUpper, 0.15);
  applyLipTexture(ctx, face, LOWER_LIP_INDICES, textureLower, 0.15);
  ctx.restore();
};

// Sheer/washed tint - matte fill with a capped-down alpha.
export const applyStainLips = ({ face, ctx, color, dimension, alpha }: ILipRenderParams) => {
  applyMatteLips({ face, ctx, color, dimension, alpha: Math.min(alpha, 0.35) });
};

// Sheer gloss tint - the gloss composite at reduced intensity.
export const applyBalmLips = ({
  face,
  ctx,
  color,
  textureUpper,
  textureLower,
  dimension,
  alpha,
}: ILipDoubleTextureRenderParams) => {
  applyTexturedLips(
    TRY_ON_SUB_CATEGORY_MAP.GLOSS,
    face,
    ctx,
    color,
    textureUpper,
    textureLower,
    dimension,
    alpha * 0.5,
  );
};

// Dewy "plumped" shine - PLUMPER's own tuning entry (see TEXTURED_FINISH_TUNING) sets the
// intensity, currently over the same shared texture GLOSS uses (no dedicated art yet - see
// GLOSS_OR_SATIN_OR_BALM_OR_PLUMPER_TEXTURE_PATH_UPPER/_LOWER's comment). `alpha` passes
// straight through like every other textured finish here - no caller-side multiplier hack.
export const applyPlumperLips = ({
  face,
  ctx,
  color,
  textureUpper,
  textureLower,
  dimension,
  alpha,
}: ILipDoubleTextureRenderParams) => {
  applyTexturedLips(
    TRY_ON_SUB_CATEGORY_MAP.PLUMPER,
    face,
    ctx,
    color,
    textureUpper,
    textureLower,
    dimension,
    alpha,
  );
};

// High-gloss fluid shine - the oil-u/oil-l textures are the same gloss highlights blurred into
// a broader, softer glow (see OIL_TEXTURE_PATH_UPPER/_LOWER), paired with a slightly higher
// base alpha (OIL in TEXTURED_FINISH_TUNING) for a wetter, more saturated look than GLOSS.
export const applyOilLips = ({
  face,
  ctx,
  color,
  textureUpper,
  textureLower,
  dimension,
  alpha,
}: ILipDoubleTextureRenderParams) => {
  applyTexturedLips(
    TRY_ON_SUB_CATEGORY_MAP.OIL,
    face,
    ctx,
    color,
    textureUpper,
    textureLower,
    dimension,
    alpha,
  );
};
