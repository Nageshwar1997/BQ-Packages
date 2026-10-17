import type { Category, Landmark, NormalizedLandmark } from '@mediapipe/tasks-vision';

import {
  CHROME_GRADIENT_STOPS,
  DIPPOWDER_DESATURATE_RATIO,
  FINGER_JOINT_INDICES,
  GEL_HIGHLIGHT_ASPECT_RATIO,
  GEL_HIGHLIGHT_BASE_OPACITY,
  GEL_HIGHLIGHT_OFFSET_RATIO,
  GEL_HIGHLIGHT_RADIUS_RATIO,
  GEL_HIGHLIGHT_WHITEN_RATIO,
  GLITTER_SPARKLE_BASE_OPACITY,
  GLITTER_SPARKLE_COUNT,
  GLITTER_SPARKLE_MAX_RADIUS_RATIO,
  GLITTER_SPARKLE_MIN_RADIUS_RATIO,
  GLITTER_SPARKLE_SEED,
  GLITTER_SPARKLE_WHITEN_RATIO,
  INDEX_MCP_INDEX,
  MIDDLE_MCP_INDEX,
  NAIL_END_RATIO,
  NAIL_FINGER_PRESENCE_MIN_RATIO,
  NAIL_ORIENTATION_MIN_Z_RATIO,
  NAIL_ORIENTATION_SIGN,
  NAIL_START_RATIO,
  NAIL_WIDTH_RATIO,
  PINKY_MCP_INDEX,
  WRIST_INDEX,
} from '../constants/nail.js';
import type { TDetectionStatus, TDimension, TPoint, TRGBTuple } from '../types/index.js';
import type { INailRenderParams } from '../types/nail.js';
import { toColorString } from './index.js';

// NAIL's own rendering primitives - fresh design (no reference implementation covers nail try-on
// at all, see docs/tryons/NAIL-PLAN.md's Research section), built on per-hand landmark arrays
// instead of a single face mesh or a pixel mask, unlike every other primitive in this folder.

/* ================= ORIENTATION & PRESENCE GATING ===============================================
 * Real nails are only visible when (a) the back of the hand actually faces the camera (not the
 * palm, and not turned so far to the side that the nail is seen edge-on), and (b) the finger in
 * question is actually there to have a nail on. `HandLandmarker`'s 21-point skeleton alone can't
 * tell either of these apart from a normal, fully-present, camera-facing hand - it always predicts
 * the same fixed 21 points, plausibly placed, whether the palm or the back faces the camera, and
 * whether every finger is genuinely present or not. Both checks below key off
 * `HandLandmarkerResult.worldLandmarks` (real-world-scale 3D coordinates, not the normalized
 * `landmarks` used for on-screen drawing) - a per-landmark `visibility`/`presence` score would
 * have been the more direct signal, but MediaPipe's own issue tracker confirms `HandLandmarker`
 * never populates it meaningfully (always reads back as 0), so this reasons from 3D geometry
 * instead.
 */

interface IVec3 {
  x: number;
  y: number;
  z: number;
}

const toVec3 = (landmark: Landmark): IVec3 => ({ x: landmark.x, y: landmark.y, z: landmark.z });
const subtractVec3 = (a: IVec3, b: IVec3): IVec3 => ({
  x: a.x - b.x,
  y: a.y - b.y,
  z: a.z - b.z,
});
const crossVec3 = (a: IVec3, b: IVec3): IVec3 => ({
  x: a.y * b.z - a.z * b.y,
  y: a.z * b.x - a.x * b.z,
  z: a.x * b.y - a.y * b.x,
});
const vec3Length = (v: IVec3): number => Math.hypot(v.x, v.y, v.z);

// Hands are chiral (mirror images of each other) - the exact same real-world "back facing camera"
// pose produces an OPPOSITE-signed cross-product z-component for a Left hand versus a Right hand.
// Confirmed against real detected data, not assumed: a reference back-of-hand photo detected as
// "Left" produced a raw z-ratio of -0.77, and the same photo horizontally flipped (a mirror-image
// pose, detected as "Right") produced +0.80 for the identical physical orientation - see
// `NAIL_ORIENTATION_SIGN`'s own comment (constants/tryon-constants/nail.ts). `NAIL_ORIENTATION_SIGN`
// itself is calibrated for the "Left" case, so "Right" needs the negated sign to read the same
// physical pose correctly; an unrecognized/missing handedness label falls back to the "Left"
// calibration rather than guessing.
const getEffectiveOrientationSign = (categoryName: string | undefined): number =>
  categoryName === 'Right' ? -NAIL_ORIENTATION_SIGN : NAIL_ORIENTATION_SIGN;

// The hand's own plane normal, from the wrist and two knuckles that stay roughly coplanar with the
// back/palm regardless of finger pose - `n = (indexMcp - pinkyMcp) × (middleMcp - wrist)`, the same
// cross-product technique used to estimate palm-facing direction in hand-pose/gesture-recognition
// work generally. Its z-component (scaled by this hand's own effective sign, see
// `getEffectiveOrientationSign` above) tells us how much this hand faces the camera versus away
// from it or edge-on.
const isHandFacingCamera = (worldHand: Landmark[], categoryName: string | undefined): boolean => {
  const wrist = worldHand[WRIST_INDEX];
  const indexMcp = worldHand[INDEX_MCP_INDEX];
  const middleMcp = worldHand[MIDDLE_MCP_INDEX];
  const pinkyMcp = worldHand[PINKY_MCP_INDEX];
  if (!wrist || !indexMcp || !middleMcp || !pinkyMcp) return false;

  const normal = crossVec3(
    subtractVec3(toVec3(indexMcp), toVec3(pinkyMcp)),
    subtractVec3(toVec3(middleMcp), toVec3(wrist)),
  );
  const length = vec3Length(normal);
  if (length === 0) return false;

  const zRatio = (normal.z * getEffectiveOrientationSign(categoryName)) / length;
  return zRatio >= NAIL_ORIENTATION_MIN_Z_RATIO;
};

/* ================= DETECTION ================================================================
 * NAIL's own counterpart to `getFaceDetectionStatus`/`getHairDetectionStatus`, reusing the same
 * `TDetectionStatus` type/`detectionStatus` field (`IMakeupBaseState`) every category's state
 * already carries - just repurposed here to mean "at least one hand confidently detected, facing
 * the camera nail-side-up". Reports `'turned'` (reusing FACE's own status value, not inventing a
 * new one) when a hand IS visible but none of the detected hands actually face the camera
 * correctly (`isHandFacingCamera`) - without this, a shopper whose hand was in frame but
 * palm-facing/edge-on/sideways got silently zero nails painted with no on-screen explanation at
 * all (`applyNailFill` below skips that hand entirely, same check, but has no way to surface
 * *why* to the shopper - this function is that surfaced signal). `'not-clear'` never applies here
 * (no meaningful "hand detected but too small/blurry to trust" concept the way FACE has one).
 */
export const getHandDetectionStatus = (
  hands: NormalizedLandmark[][],
  worldHands: Landmark[][],
  handedness: Category[][],
): TDetectionStatus => {
  if (hands.length === 0) return 'not-in-frame';

  const anyHandFacingCamera = hands.some((_hand, handIndex) => {
    const worldHand = worldHands[handIndex];
    const categoryName = handedness[handIndex]?.[0]?.categoryName;
    return !!worldHand && isHandFacingCamera(worldHand, categoryName);
  });

  return anyHandFacingCamera ? 'detected' : 'turned';
};

// A stable per-hand scale reference (palm length) that `isFingerPresent` below compares each
// finger's own reach against - derived from the same hand, so it naturally scales with how close
// the hand is to the camera (unlike a fixed pixel/world distance would).
const getHandScaleReference = (worldHand: Landmark[]): number => {
  const wrist = worldHand[WRIST_INDEX];
  const middleMcp = worldHand[MIDDLE_MCP_INDEX];
  if (!wrist || !middleMcp) return 0;
  return vec3Length(subtractVec3(toVec3(middleMcp), toVec3(wrist)));
};

// A missing or fully-occluded finger's predicted landmarks tend to collapse toward a small
// cluster (the model has nothing real to anchor them to) rather than spread out to a normal
// finger's own real [MCP -> TIP] reach - see `NAIL_FINGER_PRESENCE_MIN_RATIO`'s own comment for
// why this is deliberately lenient.
const isFingerPresent = (
  worldHand: Landmark[],
  mcpIndex: number,
  tipIndex: number,
  scaleReference: number,
): boolean => {
  const mcp = worldHand[mcpIndex];
  const tip = worldHand[tipIndex];
  if (!mcp || !tip || scaleReference === 0) return false;

  const reach = vec3Length(subtractVec3(toVec3(tip), toVec3(mcp)));
  return reach / scaleReference >= NAIL_FINGER_PRESENCE_MIN_RATIO;
};

/* ================= NAIL SHAPE (LIQUID / GEL / DIPPOWDER / GLITTER / CHROME share this) =========
 * `HandLandmarker` has no landmark dedicated to the nail plate itself - every NAIL finish
 * approximates its shape from a finger's own last two joints (`FINGER_JOINT_INDICES`,
 * constants/tryon-constants/nail.ts): the vector from the near joint to the fingertip gives that
 * finger's own local direction, and a rotated ellipse anchored partway along (and slightly past)
 * that vector approximates the nail plate. This is this app's first primitive that needs a
 * per-instance *rotation* - every existing FACE/EYE blob only ever translates+scales, since a face
 * is always roughly upright in a normal selfie, but individual fingers point in whatever direction
 * the hand happens to be posed in.
 */

const toPixelPoint = (landmark: NormalizedLandmark, dimension: TDimension): TPoint => ({
  x: landmark.x * dimension.width,
  y: landmark.y * dimension.height,
});

interface INailGeometry {
  nailLength: number;
  nailWidth: number;
}

// Shared setup every nail-shape drawer below needs, factored out so LIQUID/GEL/DIPPOWDER can each
// add their own paint step without recomputing the same geometry - takes a finger's own
// [nearJoint -> TIP] vector, derives its local length/angle (same approximation every NAIL finish
// uses, see this section's own file-level comment), then runs `draw` inside a translated+rotated
// coordinate frame centered on the nail's own shape. Anything `draw` paints at `(0, 0)`, sized off
// the `nailLength`/`nailWidth` it receives, lands correctly positioned and rotated on the real
// finger - no separate transform math needed per finish.
const withNailTransform = (
  ctx: CanvasRenderingContext2D,
  nearJoint: TPoint,
  tip: TPoint,
  draw: (geometry: INailGeometry) => void,
) => {
  const dx = tip.x - nearJoint.x;
  const dy = tip.y - nearJoint.y;
  const segmentLength = Math.hypot(dx, dy);
  if (segmentLength === 0) return;

  const angle = Math.atan2(dy, dx);
  const centerRatio = (NAIL_START_RATIO + NAIL_END_RATIO) / 2;
  const centerX = nearJoint.x + dx * centerRatio;
  const centerY = nearJoint.y + dy * centerRatio;

  const nailLength = segmentLength * (NAIL_END_RATIO - NAIL_START_RATIO);
  const nailWidth = segmentLength * NAIL_WIDTH_RATIO;

  ctx.save();
  ctx.translate(centerX, centerY);
  ctx.rotate(angle);
  draw({ nailLength, nailWidth });
  ctx.restore();
};

// A flat, fairly opaque fill - unlike HAIR's translucent recolor (which needs to preserve the
// frame's own luminance so strand shading stays visible), real nail polish is meant to fully cover
// the natural nail, closer to how FOUNDATION/CONCEALER read. Drawn directly onto `ctx` (not built
// on an offscreen canvas first, unlike `fillFaceOvalRegion`/`applyHairMaskRecolor`) - there's no
// exclusion-hole punching or blend-mode step here that would need an intermediate buffer, and
// `ctx` already carries whatever mirror transform Live mode applied before `applyEffect` runs, so
// drawing straight onto it is both simpler and still correctly mirrored.
const fillNailBase = (
  ctx: CanvasRenderingContext2D,
  nailLength: number,
  nailWidth: number,
  rgb: TRGBTuple,
  alpha: number,
) => {
  const [r, g, b] = rgb;
  ctx.fillStyle = toColorString(r, g, b, alpha);
  ctx.beginPath();
  ctx.ellipse(0, 0, nailLength / 2, nailWidth / 2, 0, 0, Math.PI * 2);
  ctx.fill();
};

const drawNail = (
  ctx: CanvasRenderingContext2D,
  nearJoint: TPoint,
  tip: TPoint,
  rgb: TRGBTuple,
  alpha: number,
) => {
  withNailTransform(ctx, nearJoint, tip, ({ nailLength, nailWidth }) => {
    fillNailBase(ctx, nailLength, nailWidth, rgb, alpha);
  });
};

/* ================= GEL - glossy highlight on top of the LIQUID base fill =======================
 * Real gel polish reads noticeably shinier/glassier than LIQUID's flat fill - this app's flat
 * canvas fill has no real specular-highlight data to lean on directly (same ceiling FACE's own
 * HIGHLIGHTER/COMPACT POWDER already call out), so the shine is approximated the same way
 * HIGHLIGHTER fakes a cheekbone glow: a small, brighter feathered blob layered on top of the base
 * fill, mixed toward white (`mixTowardWhite`) rather than a fixed absolute highlight color, so it
 * still reads as *this* shade's own gloss.
 */

// Mixes `rgb` toward white by `ratio` - same technique/role as FACE's own `mixTowardWhite`
// (face.ts, `applyHighlighterFace`'s own cheekbone glow). Not cross-imported from there - each
// category's render functions stay self-contained here, same as every other small color-math
// helper in this folder (LIP's `isBrightColor`, FACE's own `mixTowardBlack`/`applyWarmShift`).
const mixTowardWhite = (rgb: TRGBTuple, ratio: number): TRGBTuple => {
  const [r, g, b] = rgb;
  return [r + (255 - r) * ratio, g + (255 - g) * ratio, b + (255 - b) * ratio];
};

// Mixes `rgb` toward black by `ratio` - same technique/role as FACE's own `mixTowardBlack`
// (face.ts, `applyContourFace`'s own jaw-hollow shadow). Not cross-imported for the same
// "each category stays self-contained" reasoning as `mixTowardWhite` above - used by CHROME's own
// gradient bands, not GEL.
const mixTowardBlack = (rgb: TRGBTuple, ratio: number): TRGBTuple => {
  const [r, g, b] = rgb;
  return [r * (1 - ratio), g * (1 - ratio), b * (1 - ratio)];
};

// A soft radial-gradient blob, offset toward the nail's own base (cuticle) half rather than
// centered - same "solid-ish at center, fading to fully transparent at the edge" radial-gradient
// technique as FACE's own `drawFeatheredBlob`, reimplemented locally (elongated along the nail's
// own length axis via `GEL_HIGHLIGHT_ASPECT_RATIO` instead of drawn as a circle) since this runs
// inside `withNailTransform`'s already-rotated coordinate frame, not a face-oval-clipped one.
const drawGelHighlight = (
  ctx: CanvasRenderingContext2D,
  nailLength: number,
  rgb: TRGBTuple,
  alpha: number,
) => {
  const [r, g, b] = mixTowardWhite(rgb, GEL_HIGHLIGHT_WHITEN_RATIO);

  const radiusX = nailLength * GEL_HIGHLIGHT_RADIUS_RATIO;
  const radiusY = radiusX * GEL_HIGHLIGHT_ASPECT_RATIO;
  // Negative = toward the near-joint (cuticle/base) half, since `withNailTransform`'s local
  // +x axis points from the near joint toward the TIP.
  const offsetX = -nailLength * GEL_HIGHLIGHT_OFFSET_RATIO;

  ctx.save();
  ctx.translate(offsetX, 0);
  ctx.scale(1, radiusY / radiusX);

  const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, radiusX);
  gradient.addColorStop(0, toColorString(r, g, b, GEL_HIGHLIGHT_BASE_OPACITY * alpha));
  gradient.addColorStop(1, toColorString(r, g, b, 0));

  ctx.beginPath();
  ctx.arc(0, 0, radiusX, 0, Math.PI * 2);
  ctx.fillStyle = gradient;
  ctx.fill();
  ctx.restore();
};

const drawGelNail = (
  ctx: CanvasRenderingContext2D,
  nearJoint: TPoint,
  tip: TPoint,
  rgb: TRGBTuple,
  alpha: number,
) => {
  withNailTransform(ctx, nearJoint, tip, ({ nailLength, nailWidth }) => {
    fillNailBase(ctx, nailLength, nailWidth, rgb, alpha);
    drawGelHighlight(ctx, nailLength, rgb, alpha);
  });
};

/* ================= DIPPOWDER - desaturated fill =================================================
 * Real dip powder reads chalkier and less glossy than LIQUID's flat fill - same "no real
 * specular-highlight data to directly dampen" ceiling GEL's own comment calls out, just the
 * opposite direction: "less shine" is approximated as reduced color vibrancy instead, same
 * technique/reasoning as FACE's own COMPACT POWDER (`desaturateTowardGray`, `applyCompactPowderFace`).
 */

// Mixes `rgb` toward its own luminance-matched gray by `ratio` - same technique/role as FACE's own
// `desaturateTowardGray` (face.ts), not cross-imported for the same "each category stays
// self-contained" reasoning as `mixTowardWhite` above. Rec. 601 luma weights, same standard
// "perceived brightness" approximation any grayscale conversion uses.
const desaturateTowardGray = (rgb: TRGBTuple, ratio: number): TRGBTuple => {
  const [r, g, b] = rgb;
  const gray = 0.299 * r + 0.587 * g + 0.114 * b;
  return [r + (gray - r) * ratio, g + (gray - g) * ratio, b + (gray - b) * ratio];
};

const drawDipPowderNail = (
  ctx: CanvasRenderingContext2D,
  nearJoint: TPoint,
  tip: TPoint,
  rgb: TRGBTuple,
  alpha: number,
) => {
  const mutedRgb = desaturateTowardGray(rgb, DIPPOWDER_DESATURATE_RATIO);
  withNailTransform(ctx, nearJoint, tip, ({ nailLength, nailWidth }) => {
    fillNailBase(ctx, nailLength, nailWidth, mutedRgb, alpha);
  });
};

/* ================= GLITTER - sparkle particles on top of the LIQUID base fill ===================
 * Real glitter polish is a colored base with small reflective flecks suspended in it - same base
 * fill as LIQUID, plus a handful of small, bright sparkle dots scattered across each nail.
 * Positions/sizes come from a fixed-seed PRNG (`GLITTER_SPARKLE_SEED`, constants/tryon-constants/
 * nail.ts - see that constant's own comment for why it's fixed, never `Math.random()`), drawn
 * inside the nail's own already-rotated local coordinate frame - the same fixed pattern of dots
 * rigidly follows the nail's own position/rotation across frames instead of jumping around.
 */

// Same mulberry32 PRNG technique as HAIR's own `createSeededRandom` (hair.ts) - not cross-imported
// for the same "each category keeps its own small helpers self-contained" reasoning as
// `mixTowardWhite`/`desaturateTowardGray` above.
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

// Scatters `GLITTER_SPARKLE_COUNT` small bright dots across the nail's own ellipse (its local
// frame, centered at `(0, 0)` with semi-axes `nailLength / 2`/`nailWidth / 2`) - polar sampling
// (`Math.sqrt(random())` for the radius fraction) so dots land uniformly across the whole shape
// instead of clustering near the center, the standard "uniform point in a disk" technique
// generalized to an ellipse via the same non-uniform per-axis scale `drawFeatheredBlob` (face.ts)
// and `drawGelHighlight` above both already use for their own elliptical shapes.
const drawGlitterSparkles = (
  ctx: CanvasRenderingContext2D,
  nailLength: number,
  nailWidth: number,
  rgb: TRGBTuple,
  alpha: number,
) => {
  const random = createSeededRandom(GLITTER_SPARKLE_SEED);
  const [r, g, b] = mixTowardWhite(rgb, GLITTER_SPARKLE_WHITEN_RATIO);

  for (let i = 0; i < GLITTER_SPARKLE_COUNT; i++) {
    const angle = random() * Math.PI * 2;
    const radiusFraction = Math.sqrt(random());
    const x = Math.cos(angle) * radiusFraction * (nailLength / 2);
    const y = Math.sin(angle) * radiusFraction * (nailWidth / 2);

    const sparkleRadius =
      nailWidth *
      (GLITTER_SPARKLE_MIN_RADIUS_RATIO +
        random() * (GLITTER_SPARKLE_MAX_RADIUS_RATIO - GLITTER_SPARKLE_MIN_RADIUS_RATIO));
    // Each sparkle gets its own randomized brightness (60-100% of the base opacity) so the flecks
    // read as naturally varied glints, not a uniform dot pattern stamped onto the nail.
    const sparkleAlpha = GLITTER_SPARKLE_BASE_OPACITY * alpha * (0.6 + random() * 0.4);

    ctx.beginPath();
    ctx.fillStyle = toColorString(r, g, b, sparkleAlpha);
    ctx.arc(x, y, sparkleRadius, 0, Math.PI * 2);
    ctx.fill();
  }
};

const drawGlitterNail = (
  ctx: CanvasRenderingContext2D,
  nearJoint: TPoint,
  tip: TPoint,
  rgb: TRGBTuple,
  alpha: number,
) => {
  withNailTransform(ctx, nearJoint, tip, ({ nailLength, nailWidth }) => {
    fillNailBase(ctx, nailLength, nailWidth, rgb, alpha);
    drawGlitterSparkles(ctx, nailLength, nailWidth, rgb, alpha);
  });
};

/* ================= CHROME - metallic gradient fill ===============================================
 * Real chrome polish is mirror-like - without a real lighting/reflection model, this is faked the
 * same "static gradient illusion" way HAIR's own HIGHLIGHTS faked balayage (see
 * `CHROME_GRADIENT_STOPS`'s own comment, constants/tryon-constants/nail.ts): a linear gradient
 * with alternating dark/light bands running along the nail's own length, instead of LIQUID's flat
 * fill or GEL's single localized highlight. This is the one NAIL finish that doesn't build on
 * `fillNailBase` - the whole surface is metallic, not a flat base plus a small accent layer.
 */

// Builds the gradient itself from `CHROME_GRADIENT_STOPS` - each stop's `mix` is a signed ratio
// (positive toward white via `mixTowardWhite`, negative toward black via `mixTowardBlack`), so the
// same stop list can express both the dark and bright bands. The gradient runs along the local
// x-axis (`withNailTransform`'s length direction, cuticle at `-nailLength / 2` to tip at
// `+nailLength / 2`) rather than the width axis - a nail's length is its dominant dimension, so a
// lengthwise sweep reads as a coherent metallic streak instead of a few compressed bands.
const buildChromeGradient = (
  ctx: CanvasRenderingContext2D,
  nailLength: number,
  rgb: TRGBTuple,
  alpha: number,
): CanvasGradient => {
  const gradient = ctx.createLinearGradient(-nailLength / 2, 0, nailLength / 2, 0);
  CHROME_GRADIENT_STOPS.forEach(({ offset, mix }) => {
    const [r, g, b] = mix >= 0 ? mixTowardWhite(rgb, mix) : mixTowardBlack(rgb, -mix);
    gradient.addColorStop(offset, toColorString(r, g, b, alpha));
  });
  return gradient;
};

const drawChromeNail = (
  ctx: CanvasRenderingContext2D,
  nearJoint: TPoint,
  tip: TPoint,
  rgb: TRGBTuple,
  alpha: number,
) => {
  withNailTransform(ctx, nearJoint, tip, ({ nailLength, nailWidth }) => {
    ctx.fillStyle = buildChromeGradient(ctx, nailLength, rgb, alpha);
    ctx.beginPath();
    ctx.ellipse(0, 0, nailLength / 2, nailWidth / 2, 0, 0, Math.PI * 2);
    ctx.fill();
  });
};

type TDrawNailShape = (
  ctx: CanvasRenderingContext2D,
  nearJoint: TPoint,
  tip: TPoint,
  rgb: TRGBTuple,
  alpha: number,
) => void;

// Draws every visible, plausible nail (up to 5 per hand, across every detected hand) via whichever
// `drawNailShape` primitive the caller passes (`drawNail`/`drawGelNail`/`drawDipPowderNail`/
// `drawGlitterNail`/`drawChromeNail`) - skips a whole hand if it isn't facing the camera
// nail-side-up (`isHandFacingCamera`), and skips an individual finger if it doesn't look genuinely
// present (`isFingerPresent`), rather than approximating a nail onto a finger that isn't really
// there.
const applyNailFill = (
  ctx: CanvasRenderingContext2D,
  hands: NormalizedLandmark[][],
  worldHands: Landmark[][],
  handedness: Category[][],
  rgb: TRGBTuple,
  dimension: TDimension,
  alpha: number,
  drawNailShape: TDrawNailShape,
) => {
  hands.forEach((hand, handIndex) => {
    const worldHand = worldHands[handIndex];
    const categoryName = handedness[handIndex]?.[0]?.categoryName;
    if (!worldHand || !isHandFacingCamera(worldHand, categoryName)) return;

    const scaleReference = getHandScaleReference(worldHand);

    for (const [mcpIndex, nearIndex, tipIndex] of FINGER_JOINT_INDICES) {
      if (!isFingerPresent(worldHand, mcpIndex, tipIndex, scaleReference)) continue;

      const nearLandmark = hand[nearIndex];
      const tipLandmark = hand[tipIndex];
      if (!nearLandmark || !tipLandmark) continue;

      drawNailShape(
        ctx,
        toPixelPoint(nearLandmark, dimension),
        toPixelPoint(tipLandmark, dimension),
        rgb,
        alpha,
      );
    }
  });
};

export const applyLiquidNail = ({
  ctx,
  hands,
  worldHands,
  handedness,
  rgb,
  dimension,
  alpha,
}: INailRenderParams) => {
  applyNailFill(ctx, hands, worldHands, handedness, rgb, dimension, alpha, drawNail);
};

export const applyGelNail = ({
  ctx,
  hands,
  worldHands,
  handedness,
  rgb,
  dimension,
  alpha,
}: INailRenderParams) => {
  applyNailFill(ctx, hands, worldHands, handedness, rgb, dimension, alpha, drawGelNail);
};

export const applyDipPowderNail = ({
  ctx,
  hands,
  worldHands,
  handedness,
  rgb,
  dimension,
  alpha,
}: INailRenderParams) => {
  applyNailFill(ctx, hands, worldHands, handedness, rgb, dimension, alpha, drawDipPowderNail);
};

export const applyGlitterNail = ({
  ctx,
  hands,
  worldHands,
  handedness,
  rgb,
  dimension,
  alpha,
}: INailRenderParams) => {
  applyNailFill(ctx, hands, worldHands, handedness, rgb, dimension, alpha, drawGlitterNail);
};

export const applyChromeNail = ({
  ctx,
  hands,
  worldHands,
  handedness,
  rgb,
  dimension,
  alpha,
}: INailRenderParams) => {
  applyNailFill(ctx, hands, worldHands, handedness, rgb, dimension, alpha, drawChromeNail);
};
