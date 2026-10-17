import type { NormalizedLandmark } from '@mediapipe/tasks-vision';

import {
  BBCREAM_BASE_ALPHA,
  BRONZER_WARM_RATIO,
  BRONZER_WARM_SHIFT,
  CHEEK_APPLE_LEFT_INDEX,
  CHEEK_APPLE_RIGHT_INDEX,
  CHEEKBONE_LEFT_INDEX,
  CHEEKBONE_RIGHT_INDEX,
  COMPACTPOWDER_BASE_ALPHA,
  COMPACTPOWDER_MATTIFY_RATIO,
  CONCEALER_BLOB_ASPECT_RATIO,
  CONCEALER_BLOB_WIDTH_RATIO,
  CONTOUR_BLOB_ASPECT_RATIO,
  CONTOUR_BLOB_RADIUS_RATIO,
  CONTOUR_DARKEN_RATIO,
  CONTOUR_INWARD_OFFSET_RATIO,
  CONTOUR_UPWARD_OFFSET_RATIO,
  FACE_OVAL_INDICES,
  FOREHEAD_EXTENSION_RATIO,
  FOREHEAD_EXTENSION_TAPER_RATIO,
  HIGHLIGHTER_BLOB_RADIUS_RATIO,
  HIGHLIGHTER_WHITEN_RATIO,
  JAW_HOLLOW_LEFT_INDEX,
  JAW_HOLLOW_RIGHT_INDEX,
  LEFT_EYE_INDICES,
  LEFT_EYEBROW_INDICES,
  LOCALIZED_BLOB_RADIUS_RATIO,
  MOUTH_OUTER_CONTOUR_INDICES,
  NOSE_TIP_INDEX,
  RIGHT_EYE_INDICES,
  RIGHT_EYEBROW_INDICES,
  UNDER_EYE_LEFT_INDEX,
  UNDER_EYE_OFFSET_RATIO,
  UNDER_EYE_RIGHT_INDEX,
} from '../constants/face.js';
import type { IFaceRenderParams } from '../types/face.js';
import type { TDimension, TPoint, TRGBTuple } from '../types/index.js';
import { createOffscreenCtx, toColorString } from './index.js';

// FACE-specific canvas rendering - fresh design (not ported from any reference
// implementation, see docs/tryons/FACE.md), built directly on the same primitives LIP's own
// utils already established in this app (landmark-driven clip paths, native `ctx.filter` for
// blur rather than a manual multi-sample kernel).
//
// Deliberately landmark-only - an earlier version of this file also tried to detect and erase
// hair/beard/mustache from the tint using a pixel-color heuristic (sampling the source frame to
// guess "skin" vs "not skin" by luminance/saturation). That was dropped: a color-only guess has
// no real way to tell dark hair from dark *skin*, so any threshold that catches hair reliably
// also risks misreading a deeper skin tone as hair near the face's edges - a fairness problem,
// not just a tuning one. Instead, the upload/live instructions screen (see
// `FACE_UPLOAD_INSTRUCTIONS`/`FACE_LIVE_INSTRUCTIONS` in constants/tryon-constants/face.ts)
// tells the shopper up front to keep hair off their face - the same "set the shopper up for a
// good frame" approach already used there for lighting/framing/no-sunglasses, rather than
// trying to algorithmically fix a bad frame after the fact.

const toPoints = (face: NormalizedLandmark[], indices: number[], dimension: TDimension) =>
  indices
    .map((index) => face[index])
    .filter((point): point is NormalizedLandmark => point !== undefined)
    .map((point) => ({ x: point.x * dimension.width, y: point.y * dimension.height }));

const midpoint = (a: TPoint, b: TPoint): TPoint => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });

// Traces a *smoothed* closed loop through every point - each point becomes a quadratic-curve
// control point, with the curve actually passing through the midpoint before/after it, rather
// than a sharp `lineTo` polygon corner at the point itself. Same technique LIP's own
// `applyLipTexture` already uses successfully in this app for its texture-clip path, just
// closed (wraps last point back to first) instead of padded/open. Any full-face region or
// exclusion hole traced this way reads as a naturally rounded contour instead of a faceted
// polygon - most noticeable on the eyebrows/mouth, whose landmark rings are sparse enough that
// straight edges between them look visibly angular.
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

// `FACE_OVAL_INDICES`' own topmost points sit right at the hairline, not partway up the
// forehead (see the constant's own comment) - pushes just the near-top points upward, tapering
// smoothly down to unchanged by `FOREHEAD_EXTENSION_TAPER_RATIO` of the face's own detected
// height, so the added coverage blends into the untouched sides/jaw rather than kinking at a
// hard cutoff.
const applyForeheadExtension = (points: TPoint[]): TPoint[] => {
  const ys = points.map((p) => p.y);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const faceHeight = maxY - minY;
  const extension = faceHeight * FOREHEAD_EXTENSION_RATIO;
  const taperBand = faceHeight * FOREHEAD_EXTENSION_TAPER_RATIO;
  if (taperBand <= 0) return points;

  return points.map((point) => {
    const distanceFromTop = point.y - minY;
    if (distanceFromTop >= taperBand) return point;
    const falloff = 1 - distanceFromTop / taperBand;
    return { x: point.x, y: point.y - extension * falloff };
  });
};

/* ================= POSE CHECK ================================================================
 * A head turned too far to one side is a hard case for every full-face finish here: the clip
 * region is built entirely from 2D landmark positions with no real notion of depth/occlusion
 * (see `eraseExcludedFeatures`'s own comment on the self-intersection bug a turned head already
 * exposed once, and `applyFoundationFace`'s history on the same root cause painting past the
 * visible nose). Fully solving that would need real 3D pose awareness - this instead catches the
 * clearly-too-far cases up front and asks for a better frame, the same "set the shopper up
 * right" approach `FACE_UPLOAD_INSTRUCTIONS`/`FACE_LIVE_INSTRUCTIONS` (constants/
 * tryon-constants/face.ts) already take for lighting/hair, rather than trying to render through
 * an angle this approach was never going to handle well.
 */

// How symmetric the two side-to-nose distances have to stay before a head reads as "turned too
// far" - 1 is perfectly frontal (both sides equidistant from the nose), 0 is a full profile (one
// side has collapsed to the nose itself). Picked to allow a real, natural amount of turn (a
// shopper glancing slightly to the side, or a head that isn't perfectly square to the camera)
// without flagging it - only meaningfully lopsided readings trip this.
const FACE_TURN_SYMMETRY_THRESHOLD = 0.5;

// Purely landmark-position based (no pixel/color analysis, same reasoning as
// `getFaceDetectionStatus` in tryon-utils/index.ts) - compares how far the nose tip sits from
// each cheekbone horizontally. A frontal face keeps these two distances close to equal; turning
// the head (yaw) foreshortens the far side toward the nose while the near side stays roughly put,
// skewing the ratio well before the landmark-oval rendering itself visibly breaks down. Doesn't
// need to know which cheekbone is anatomically left/right - only the ratio between the two
// matters, so `CHEEKBONE_LEFT_INDEX`/`CHEEKBONE_RIGHT_INDEX`'s own camera-vs-anatomical labeling
// is irrelevant here.
export const isFaceTurnedTooMuch = (face: NormalizedLandmark[]): boolean => {
  const nose = face[NOSE_TIP_INDEX];
  const leftCheek = face[CHEEKBONE_LEFT_INDEX];
  const rightCheek = face[CHEEKBONE_RIGHT_INDEX];
  if (!nose || !leftCheek || !rightCheek) return false;

  const leftDistance = Math.abs(nose.x - leftCheek.x);
  const rightDistance = Math.abs(rightCheek.x - nose.x);
  const larger = Math.max(leftDistance, rightDistance);
  if (larger === 0) return false;

  const symmetry = Math.min(leftDistance, rightDistance) / larger;
  return symmetry < FACE_TURN_SYMMETRY_THRESHOLD;
};

/* ================= FULL-FACE FINISHES (FOUNDATION / BBCREAM / BRONZER / COMPACTPOWDER) ======
 * All four fill the same region (face oval, minus eyes/eyebrows/mouth) - only their color,
 * alpha, and blend mode differ, so the region-clipping is written once here and reused.
 */

// Clips to the full face oval (forehead-extended) only - eyes/eyebrows/mouth are punched out
// separately, by `eraseExcludedFeatures` below, *after* the tint is filled in.
const clipToFaceOval = (
  ctx: CanvasRenderingContext2D,
  face: NormalizedLandmark[],
  dimension: TDimension,
) => {
  ctx.beginPath();
  traceSmoothClosedPath(ctx, applyForeheadExtension(toPoints(face, FACE_OVAL_INDICES, dimension)));
  ctx.clip();
};

// Erases eyes/eyebrows/mouth from whatever's already painted on `ctx`, one feature at a time.
// Originally these were traced as holes in the *same* path as the outer oval, subtracted in one
// `evenodd` clip - correct on a frontal face, but a turned/angled head foreshortens a thin
// feature like an eyebrow enough that its own point ring can self-intersect (a "bowtie" instead
// of a simple loop). `evenodd` counts crossings *across the whole combined path*, so a
// self-intersecting hole doesn't just fail to exclude itself - it can miscount for the outer
// oval too, which is exactly what turning the head exposed: eyebrow/eye/lips getting tinted
// instead of staying excluded. Erasing each feature as its own independent
// `destination-out` fill has no such cross-talk - even if one feature's own ring
// self-intersects under an extreme angle, the damage stays contained to that one feature
// (worst case, part of it doesn't get excluded) instead of corrupting the whole face region.
const eraseExcludedFeatures = (
  ctx: CanvasRenderingContext2D,
  face: NormalizedLandmark[],
  dimension: TDimension,
) => {
  ctx.save();
  ctx.globalCompositeOperation = 'destination-out';
  [
    LEFT_EYE_INDICES,
    RIGHT_EYE_INDICES,
    LEFT_EYEBROW_INDICES,
    RIGHT_EYEBROW_INDICES,
    // Mouth stays a single ring around the *outer* boundary (see MOUTH_OUTER_CONTOUR_INDICES'
    // own comment) - excludes the whole opening regardless of how wide it is, so an open mouth
    // never gets foundation painted across the visible teeth/interior.
    MOUTH_OUTER_CONTOUR_INDICES,
  ].forEach((indices) => {
    ctx.beginPath();
    traceSmoothClosedPath(ctx, toPoints(face, indices, dimension));
    ctx.fill();
  });
  ctx.restore();
};

// Fills the face-oval region (forehead-extended, eyes/eyebrows/mouth punched out) with a single
// flat color at a given alpha - shared by every full-face finish (FOUNDATION and now BRONZER;
// BBCREAM/COMPACTPOWDER will reuse this too once they get their own dedicated renderers).
// Extracted out of what was FOUNDATION's own function body once BRONZER needed the exact same
// fill/clip/erase/composite shape, just with a warmed color computed first - see
// `applyBronzerFace`'s own comment. Plain `source-over` (not `multiply`) - `multiply` was here
// before specifically to let the skin's own natural light/shadow variation show through the tint
// instead of flattening the whole face into one uniform flat color, but `temp` (below) is a
// *blank* canvas at the point this fills it, so there's nothing underneath to actually multiply
// against - the "show shading through" only ever came from the final `ctx.drawImage(temp, 0, 0)`
// alpha-compositing this semi-transparent layer over the real photo already on `ctx`, not from
// this fill's own blend mode. Confirmed the hard way via real-device testing: a multiply blend
// over a fully-transparent backdrop is a genuine cross-engine inconsistency (desktop Chrome's
// canvas engine resolves it to the source color per the compositing spec's edge-case formula;
// at least one mobile browser's engine instead produced a fully transparent - and so entirely
// invisible - result). `source-over` has no such edge case and is what this was already
// functionally equivalent to everywhere it happened to work.
const fillFaceOvalRegion = (
  face: NormalizedLandmark[],
  ctx: CanvasRenderingContext2D,
  color: string,
  dimension: TDimension,
  alpha: number,
) => {
  // Composited on a temp canvas first, so the final `drawImage` onto the real, possibly-mirrored
  // `ctx` is one already-finished layer - same "build on an off-screen canvas, composite once"
  // shape as LIP's own `applyMatteLips`, and for the same reason: `ctx` may have a mirror
  // transform active (Live mode) that only the *final* draw should go through, not every
  // intermediate step.
  const tempCtx = createOffscreenCtx(dimension);
  if (!tempCtx) return;

  tempCtx.save();
  clipToFaceOval(tempCtx, face, dimension);
  tempCtx.fillStyle = color;
  tempCtx.globalAlpha = alpha;
  tempCtx.fillRect(0, 0, dimension.width, dimension.height);
  tempCtx.restore();

  eraseExcludedFeatures(tempCtx, face, dimension);

  ctx.drawImage(tempCtx.canvas, 0, 0);
};

export const applyFoundationFace = ({ face, ctx, rgb, dimension, alpha }: IFaceRenderParams) => {
  // Used to take a pre-built `color: string` directly - the one FACE finish that did, while
  // every other finish took raw `rgb` (see `IFaceRenderParams`'s own comment on why that got
  // unified). Builds it here now instead, the same `toColorString(...,0.6)` FaceEngineBase's
  // `applyEffect` used to build on FOUNDATION's behalf before every finish shared one param shape.
  const [r, g, b] = rgb;
  const color = toColorString(r, g, b, 0.6);
  fillFaceOvalRegion(face, ctx, color, dimension, alpha);
};

/* ================= LOCALIZED FINISHES (BLUSH / HIGHLIGHTER / CONTOUR) ========================
 * Unlike the full-face finishes above, these don't fill a region - they place a single soft,
 * feathered blob at one anchor point per cheek (`CHEEK_APPLE_LEFT_INDEX`/`CHEEK_APPLE_RIGHT_INDEX`
 * in constants/tryon-constants/face.ts), the same way a real blush/highlighter/contour stick is
 * actually applied - a dab at one spot, blended outward - rather than an even wash across a
 * whole area.
 */

// Solid-ish at `center`, fading to fully transparent by `radiusX`, fed through a non-uniform
// scale (`radiusY / radiusX`) to turn the circle into an ellipse when the two differ (CONCEALER's
// wide, short under-eye shape) - a radial gradient either way, not a flat shape blurred
// afterward: blur only softens edges that already exist, it can't produce this "concentrated in
// the middle, gone by the edge" falloff on its own, and a blur wide enough to look this soft
// would need to be wide enough to noticeably shrink the visible color too - an extra tuning knob
// this sidesteps by building the falloff directly into the fill instead. `radiusX === radiusY`
// (BLUSH's plain circular blob) makes the scale a no-op, so this is a strict generalization of
// the original circle-only version - BLUSH's own call/output is unchanged.
const drawFeatheredBlob = (
  ctx: CanvasRenderingContext2D,
  center: TPoint,
  radiusX: number,
  radiusY: number,
  rgb: TRGBTuple,
  alpha: number,
) => {
  const [r, g, b] = rgb;

  ctx.save();
  ctx.translate(center.x, center.y);
  ctx.scale(1, radiusY / radiusX);

  const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, radiusX);
  // 0.6 base opacity at dead center - same fixed "how strong the pure color reads" baseline
  // `FaceEngineBase.applyEffect` already bakes into every other FACE finish's color string
  // (see `applyFoundationFace`'s own `rgba(...,0.6)`), multiplied here by the caller's own
  // `alpha` (the intensity slider) directly into the color-stop math rather than via
  // `ctx.globalAlpha` - multiple blobs get drawn per call (e.g. left/right cheek or eye) and
  // baking the alpha into each gradient's own stops keeps them independent instead of relying on
  // shared canvas state.
  gradient.addColorStop(0, toColorString(r, g, b, 0.6 * alpha));
  gradient.addColorStop(1, toColorString(r, g, b, 0));

  ctx.beginPath();
  ctx.arc(0, 0, radiusX, 0, Math.PI * 2);
  ctx.fillStyle = gradient;
  ctx.fill();
  ctx.restore();
};

// Cheek color-wash - a feathered blob centered on each cheek apple, radius scaled off the
// face's own detected width (`LOCALIZED_BLOB_RADIUS_RATIO`) so it stays proportional across
// face sizes/camera distances, same reasoning as every other size in this app. Clipped to the
// face oval first (same helper the full-face finishes use) purely as a safety net - the blob's
// own radius is already small enough to stay well inside the face under normal proportions, this
// just guarantees it can never paint past the face oval even on an unusual face shape.
export const applyBlushFace = ({ face, ctx, rgb, dimension, alpha }: IFaceRenderParams) => {
  const leftCheek = face[CHEEK_APPLE_LEFT_INDEX];
  const rightCheek = face[CHEEK_APPLE_RIGHT_INDEX];
  if (!leftCheek || !rightCheek) return;

  const ovalXs = toPoints(face, FACE_OVAL_INDICES, dimension).map((point) => point.x);
  const faceWidth = Math.max(...ovalXs) - Math.min(...ovalXs);
  const radius = faceWidth * LOCALIZED_BLOB_RADIUS_RATIO;

  const tempCtx = createOffscreenCtx(dimension);
  if (!tempCtx) return;

  tempCtx.save();
  clipToFaceOval(tempCtx, face, dimension);
  [leftCheek, rightCheek].forEach((point) => {
    drawFeatheredBlob(
      tempCtx,
      { x: point.x * dimension.width, y: point.y * dimension.height },
      radius,
      radius,
      rgb,
      alpha,
    );
  });
  tempCtx.restore();

  ctx.drawImage(tempCtx.canvas, 0, 0);
};

/* ================= CONCEALER ================================================================
 * Under-eye spot color correction - a wide, short feathered ellipse per eye (not a plain circle
 * like BLUSH's cheek dab), matching the real under-eye crescent's shape. There's no landmark for
 * genuine blemish detection (that needs real skin analysis, out of scope for a landmark-only
 * approach - see this file's own header comment on why hair-detection was dropped for the same
 * reason), so this covers the one universal, always-present concealer use case every shopper
 * has: brightening under the eyes.
 */

// Punches the eye openings themselves out of whatever's already painted on `ctx` - unlike BLUSH's
// cheek-apple blob (which sits far enough from any excluded feature that a gradient's soft tail
// never reaches one), CONCEALER's anchor sits right next to the eye by design, so its gradient's
// upward tail can realistically bleed onto the eyelid/eye opening without this. Same independent-
// per-feature `destination-out` technique `eraseExcludedFeatures` already uses for the full-face
// finishes, scoped down to just the two eyes here (eyebrows/mouth are irrelevant to concealer).
const eraseEyes = (
  ctx: CanvasRenderingContext2D,
  face: NormalizedLandmark[],
  dimension: TDimension,
) => {
  ctx.save();
  ctx.globalCompositeOperation = 'destination-out';
  [LEFT_EYE_INDICES, RIGHT_EYE_INDICES].forEach((indices) => {
    ctx.beginPath();
    traceSmoothClosedPath(ctx, toPoints(face, indices, dimension));
    ctx.fill();
  });
  ctx.restore();
};

export const applyConcealerFace = ({ face, ctx, rgb, dimension, alpha }: IFaceRenderParams) => {
  const leftAnchor = face[UNDER_EYE_LEFT_INDEX];
  const rightAnchor = face[UNDER_EYE_RIGHT_INDEX];
  if (!leftAnchor || !rightAnchor) return;

  const ovalYs = toPoints(face, FACE_OVAL_INDICES, dimension).map((point) => point.y);
  const faceHeight = Math.max(...ovalYs) - Math.min(...ovalYs);
  const verticalOffset = faceHeight * UNDER_EYE_OFFSET_RATIO;

  const tempCtx = createOffscreenCtx(dimension);
  if (!tempCtx) return;

  tempCtx.save();
  clipToFaceOval(tempCtx, face, dimension);
  [
    { anchor: leftAnchor, eyeIndices: LEFT_EYE_INDICES },
    { anchor: rightAnchor, eyeIndices: RIGHT_EYE_INDICES },
  ].forEach(({ anchor, eyeIndices }) => {
    const eyeXs = toPoints(face, eyeIndices, dimension).map((point) => point.x);
    const eyeWidth = Math.max(...eyeXs) - Math.min(...eyeXs);
    const radiusX = eyeWidth * CONCEALER_BLOB_WIDTH_RATIO;
    const radiusY = radiusX * CONCEALER_BLOB_ASPECT_RATIO;

    drawFeatheredBlob(
      tempCtx,
      { x: anchor.x * dimension.width, y: anchor.y * dimension.height + verticalOffset },
      radiusX,
      radiusY,
      rgb,
      alpha,
    );
  });
  eraseEyes(tempCtx, face, dimension);
  tempCtx.restore();

  ctx.drawImage(tempCtx.canvas, 0, 0);
};

/* ================= HIGHLIGHTER ================================================================
 * Glow at the face's high points - a tight, feathered blob at the top of each cheekbone (the
 * classic, always-present highlighter placement every shopper recognizes; brow-bone/nose-bridge/
 * chin are real placements too, but BLUSH/CONCEALER's own v1 scope stuck to two anchors and this
 * follows the same precedent rather than trying to cover every real-world placement at once).
 */

// Mixes `rgb` toward white by `ratio` (0 = unchanged, 1 = pure white) - plain per-channel RGB
// math, not a canvas blend mode (see `HIGHLIGHTER_WHITEN_RATIO`'s own comment on why that
// matters here specifically). Lightening the color itself, rather than leaning on a wider alpha
// range, is what makes this read as a glow instead of a pale flat wash of the shade.
const mixTowardWhite = (rgb: TRGBTuple, ratio: number): TRGBTuple => {
  const [r, g, b] = rgb;
  return [r + (255 - r) * ratio, g + (255 - g) * ratio, b + (255 - b) * ratio];
};

// Cheekbone glow - same feathered-blob primitive BLUSH/CONCEALER already use, just tighter
// (`HIGHLIGHTER_BLOB_RADIUS_RATIO`) and lightened toward white (`mixTowardWhite`) instead of
// painted at the shade's own raw color. `CHEEKBONE_LEFT_INDEX`/`CHEEKBONE_RIGHT_INDEX` sit
// higher on the face and further from the eyes than CONCEALER's under-eye anchor, so - like
// BLUSH - no eye-erase pass is needed here (verified via a synthetic-face render, same as
// BLUSH/CONCEALER's own verification).
export const applyHighlighterFace = ({ face, ctx, rgb, dimension, alpha }: IFaceRenderParams) => {
  const leftCheekbone = face[CHEEKBONE_LEFT_INDEX];
  const rightCheekbone = face[CHEEKBONE_RIGHT_INDEX];
  if (!leftCheekbone || !rightCheekbone) return;

  const ovalXs = toPoints(face, FACE_OVAL_INDICES, dimension).map((point) => point.x);
  const faceWidth = Math.max(...ovalXs) - Math.min(...ovalXs);
  const radius = faceWidth * HIGHLIGHTER_BLOB_RADIUS_RATIO;
  const glowColor = mixTowardWhite(rgb, HIGHLIGHTER_WHITEN_RATIO);

  const tempCtx = createOffscreenCtx(dimension);
  if (!tempCtx) return;

  tempCtx.save();
  clipToFaceOval(tempCtx, face, dimension);
  [leftCheekbone, rightCheekbone].forEach((point) => {
    drawFeatheredBlob(
      tempCtx,
      { x: point.x * dimension.width, y: point.y * dimension.height },
      radius,
      radius,
      glowColor,
      alpha,
    );
  });
  tempCtx.restore();

  ctx.drawImage(tempCtx.canvas, 0, 0);
};

/* ================= CONTOUR ================================================================
 * Shading along the jaw hollow - the mirror image of HIGHLIGHTER: same feathered-blob
 * primitive, but darkened instead of lightened, and shaped/positioned for the hollow of the
 * cheek/jaw rather than the top of the cheekbone. Nose-hollow/temple are real contour placements
 * too, but - same precedent as BLUSH/CONCEALER/HIGHLIGHTER's own v1 scope - this sticks to the
 * two jaw-hollow anchors rather than covering every real-world placement at once.
 */

// Mixes `rgb` toward black by `ratio` (0 = unchanged, 1 = pure black) - the mirror image of
// `mixTowardWhite` above, same plain per-channel RGB math (no canvas blend mode, same reasoning
// as `HIGHLIGHTER_WHITEN_RATIO`'s own comment). Darkening the color itself, rather than leaning
// on a higher alpha, is what makes this read as shadow instead of a saturated patch of the
// shade's own color.
const mixTowardBlack = (rgb: TRGBTuple, ratio: number): TRGBTuple => {
  const [r, g, b] = rgb;
  return [r * (1 - ratio), g * (1 - ratio), b * (1 - ratio)];
};

// Jaw-hollow shadow - `JAW_HOLLOW_LEFT_INDEX`/`JAW_HOLLOW_RIGHT_INDEX` sit right on the face
// oval's own boundary (see their own constant comment), so the anchor is nudged inward and
// upward first to land in the actual hollow of the cheek rather than right on the jaw edge.
// Taller-than-wide ellipse (`CONTOUR_BLOB_ASPECT_RATIO > 1`, the opposite of CONCEALER's flatter
// under-eye shape) to follow the hollow's own vertical drop, and darkened toward black
// (`mixTowardBlack`) instead of painted at the shade's raw color, same "read as the real
// cosmetic effect, not just a colored patch" reasoning as HIGHLIGHTER's own whitening.
export const applyContourFace = ({ face, ctx, rgb, dimension, alpha }: IFaceRenderParams) => {
  const leftAnchor = face[JAW_HOLLOW_LEFT_INDEX];
  const rightAnchor = face[JAW_HOLLOW_RIGHT_INDEX];
  if (!leftAnchor || !rightAnchor) return;

  const ovalPoints = toPoints(face, FACE_OVAL_INDICES, dimension);
  const ovalXs = ovalPoints.map((point) => point.x);
  const ovalYs = ovalPoints.map((point) => point.y);
  const faceWidth = Math.max(...ovalXs) - Math.min(...ovalXs);
  const faceHeight = Math.max(...ovalYs) - Math.min(...ovalYs);
  const inwardOffset = faceWidth * CONTOUR_INWARD_OFFSET_RATIO;
  const upwardOffset = faceHeight * CONTOUR_UPWARD_OFFSET_RATIO;
  const radiusX = faceWidth * CONTOUR_BLOB_RADIUS_RATIO;
  const radiusY = radiusX * CONTOUR_BLOB_ASPECT_RATIO;
  const shadowColor = mixTowardBlack(rgb, CONTOUR_DARKEN_RATIO);

  const tempCtx = createOffscreenCtx(dimension);
  if (!tempCtx) return;

  tempCtx.save();
  clipToFaceOval(tempCtx, face, dimension);
  [
    { anchor: leftAnchor, direction: 1 },
    { anchor: rightAnchor, direction: -1 },
  ].forEach(({ anchor, direction }) => {
    drawFeatheredBlob(
      tempCtx,
      {
        x: anchor.x * dimension.width + inwardOffset * direction,
        y: anchor.y * dimension.height - upwardOffset,
      },
      radiusX,
      radiusY,
      shadowColor,
      alpha,
    );
  });
  tempCtx.restore();

  ctx.drawImage(tempCtx.canvas, 0, 0);
};

/* ================= BRONZER ================================================================
 * Warm all-over glow - the same full-face wash FOUNDATION uses (`fillFaceOvalRegion`: face-oval
 * clip, eyes/eyebrows/mouth punched out), but the chosen shade gets warmed first so it reads as
 * a sun-kissed bronze glow rather than a neutral color-match wash - the same "make it read as
 * the real cosmetic effect, not just a colored patch" reasoning HIGHLIGHTER's whitening and
 * CONTOUR's darkening already established for the localized finishes.
 */

// Shifts `rgb` warmer (more red, a touch more green, less blue) by `ratio` - a temperature-style
// channel shift rather than mixing toward one fixed absolute bronze color (which would flatten
// every different bronzer shade toward the same hue - see `BRONZER_WARM_SHIFT`'s own comment).
// Plain per-channel RGB math, not a canvas blend mode - same reasoning as `mixTowardWhite`/
// `mixTowardBlack` above.
const applyWarmShift = (rgb: TRGBTuple, ratio: number): TRGBTuple => {
  const [r, g, b] = rgb;
  const shift = BRONZER_WARM_SHIFT * ratio;
  return [Math.min(255, r + shift), Math.min(255, g + shift * 0.4), Math.max(0, b - shift)];
};

export const applyBronzerFace = ({ face, ctx, rgb, dimension, alpha }: IFaceRenderParams) => {
  const [r, g, b] = applyWarmShift(rgb, BRONZER_WARM_RATIO);
  const color = toColorString(r, g, b, 0.6);
  fillFaceOvalRegion(face, ctx, color, dimension, alpha);
};

/* ================= BB CREAM ================================================================
 * Sheer full-face wash - same `fillFaceOvalRegion` full-face wash FOUNDATION/BRONZER use, no
 * color-mix transform at all (unlike HIGHLIGHTER's whitening or BRONZER's warm-shift), because
 * "BB cream" isn't a different hue effect - FACE.md describes it as literally "lighter than
 * foundation". That's an alpha concern, not a color one, so the only difference from
 * `applyFoundationFace` is baking in `BBCREAM_BASE_ALPHA` (0.35) instead of FOUNDATION's fixed
 * 0.6 base opacity - see `BBCREAM_BASE_ALPHA`'s own comment for why this is baked into the render
 * itself rather than relying purely on `FACE_RANGE_BOUNDS.BBCREAM`'s lower ceiling.
 */

export const applyBbCreamFace = ({ face, ctx, rgb, dimension, alpha }: IFaceRenderParams) => {
  const [r, g, b] = rgb;
  const color = toColorString(r, g, b, BBCREAM_BASE_ALPHA);
  fillFaceOvalRegion(face, ctx, color, dimension, alpha);
};

/* ================= COMPACT POWDER ==========================================================
 * Matte-finish full-face wash - same `fillFaceOvalRegion` full-face wash FOUNDATION/BRONZER/
 * BBCREAM use, but the effect it's chasing ("shine reduction") is genuinely different from any
 * of those three: it's not about coverage (FOUNDATION), warmth (BRONZER), or sheerness alone
 * (BB cream) - a real compact powder's job is to flatten shine/gloss into a matte finish. This
 * app's flat, lighting-agnostic canvas fill has no specular-highlight data to directly dampen,
 * so "less shine" gets approximated the closest color-math way available: desaturating the
 * chosen shade toward its own grayscale equivalent (`desaturateTowardGray`), which reads as
 * "flatter/less vibrant" the same way a mattifying powder visually reads on skin.
 */

// Mixes `rgb` toward its own luminance-matched gray by `ratio` - unlike `mixTowardWhite`/
// `mixTowardBlack` (which push every shade toward the same fixed absolute color), this mixes
// toward each shade's OWN gray equivalent, so it never shifts hue or overall brightness, only
// flattens vibrancy - which is what "matte" actually means, as opposed to "lighter" or "darker".
// Rec. 601 luma weights - the same standard "perceived brightness" approximation any grayscale
// conversion uses. Plain per-channel RGB math, not a canvas blend mode - same reasoning as
// `mixTowardWhite`/`mixTowardBlack`/`applyWarmShift` above.
const desaturateTowardGray = (rgb: TRGBTuple, ratio: number): TRGBTuple => {
  const [r, g, b] = rgb;
  const gray = 0.299 * r + 0.587 * g + 0.114 * b;
  return [r + (gray - r) * ratio, g + (gray - g) * ratio, b + (gray - b) * ratio];
};

export const applyCompactPowderFace = ({ face, ctx, rgb, dimension, alpha }: IFaceRenderParams) => {
  const [r, g, b] = desaturateTowardGray(rgb, COMPACTPOWDER_MATTIFY_RATIO);
  const color = toColorString(r, g, b, COMPACTPOWDER_BASE_ALPHA);
  fillFaceOvalRegion(face, ctx, color, dimension, alpha);
};
