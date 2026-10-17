import type { IRangeBounds, IShade, ITryOnInstruction } from '../types/index.js';
import type { TNailFinish } from '../types/nail.js';

// Hand landmark indices (into MediaPipe HandLandmarker's 21-point-per-hand skeleton) for the NAIL
// Try-On engine. Fresh design (no reference implementation covers nail try-on at all - see
// docs/tryons/NAIL-PLAN.md's Research section) - the indices below trace MediaPipe's own standard,
// publicly documented hand-landmark topology (wrist + 4 joints per finger), the same kind of
// public data `FACE_OVAL_INDICES` (constants/tryon-constants/face.ts) already draws on for its own
// mesh, not anything proprietary.

// Each finger's knuckle (MCP), near joint, and fingertip, in that order - `TIP` is the fingertip
// itself, the joint right before it is `DIP` for the four fingers or `IP` for the thumb (the thumb
// has one fewer joint than the others). A nail plate has no dedicated landmark of its own - every
// NAIL render function approximates its shape from the [nearJoint, tip] pair (see
// `NAIL_START_RATIO`/`NAIL_END_RATIO`/`NAIL_WIDTH_RATIO` below), the same "real landmark +
// geometric approximation" technique `FACE_OVAL_INDICES`'s own forehead extension or
// `CONCEALER_BLOB_WIDTH_RATIO`'s under-eye anchor already use elsewhere in this app. `mcp` is only
// used for the finger-presence check (`isFingerPresent`, utils/tryon-utils/nail.ts) - a missing or
// heavily-occluded finger's whole [MCP -> TIP] reach collapses, which the last-segment-only
// [nearJoint, tip] pair alone wouldn't reliably distinguish from a normal finger's own naturally
// short last segment.
export const FINGER_JOINT_INDICES: [mcp: number, nearJoint: number, tip: number][] = [
  [2, 3, 4], // thumb: MCP -> IP -> TIP
  [5, 7, 8], // index: MCP -> DIP -> TIP
  [9, 11, 12], // middle: MCP -> DIP -> TIP
  [13, 15, 16], // ring: MCP -> DIP -> TIP
  [17, 19, 20], // pinky: MCP -> DIP -> TIP
];

// Landmarks used to test a hand's own orientation relative to the camera (`isHandFacingCamera`,
// utils/tryon-utils/nail.ts) - the wrist plus three knuckles (MCPs) that stay roughly coplanar
// with the back/palm of the hand regardless of how the fingers themselves are posed.
export const WRIST_INDEX = 0;
export const INDEX_MCP_INDEX = 5;
export const MIDDLE_MCP_INDEX = 9;
export const PINKY_MCP_INDEX = 17;

// `isHandFacingCamera` computes the hand's own plane normal (via a 3D cross product on
// `HandLandmarkerResult.worldLandmarks`, real-world-scale coordinates - not the normalized
// `landmarks` used for on-screen drawing) and checks its camera-facing (z) component. Real nails
// are only visible when the *back* of the hand faces the camera - a palm-facing or edge-on
// (side-profile) hand should never get nails painted on it, see docs/tryons/NAIL-PLAN.md's Open
// question 1 (this resolves it, rather than leaving it to the instructions screen alone).
//
// `NAIL_ORIENTATION_SIGN` flips which physical direction counts as "facing the camera" - MediaPipe
// world-landmark axis conventions aren't something to guess blindly, so this was calibrated
// against a real photo rather than assumed: a known-correct back-of-hand-facing-camera reference
// photo (Wikimedia Commons, "Hand, fingers - back.jpg") produced a raw z-ratio of *-0.77* before
// this sign was applied - i.e. the naive `+1` guess had the polarity backwards. `-1` is what makes
// a genuine back-of-hand photo read as "facing the camera" per `NAIL_ORIENTATION_MIN_Z_RATIO`
// below.
//
// IMPORTANT - this calibration is Left-hand-specific: the reference photo's own detected
// `handedness` was "Left". Hands are chiral (mirror images of each other), so the exact same
// physical "back facing camera" pose produces an OPPOSITE-signed z-component for a Right hand -
// confirmed with real data, not assumed: the same reference photo horizontally flipped (a genuine
// mirror-image pose, detected as "Right") produced a raw z-ratio of *+0.80*, the opposite sign for
// the identical physical orientation. A single fixed sign can only ever be correct for one
// handedness, so `getEffectiveOrientationSign` (utils/tryon-utils/nail.ts) negates this constant
// for hands MediaPipe reports as "Right", and falls back to this "Left" calibration for an
// unrecognized/missing handedness label.
export const NAIL_ORIENTATION_SIGN = -1;
// How much of the normal vector's own length has to point toward the camera (after applying the
// sign above) before a hand counts as "facing the camera enough to paint nails on" - `0` would
// accept a hand turned fully edge-on (the normal is perpendicular to the camera, this ratio hits
// 0 exactly), `1` would demand a perfectly square-on hand with zero tolerance. Deliberately
// mid-range so a natural, slightly-turned hand pose still qualifies - expected to get real-device
// tuned once this actually renders, same as every other approximate ratio in this app.
export const NAIL_ORIENTATION_MIN_Z_RATIO = 0.3;

// `isFingerPresent` (utils/tryon-utils/nail.ts) compares a finger's own real-world [MCP -> TIP]
// reach against the same hand's own scale reference (`getHandScaleReference` - the
// wrist-to-middle-MCP distance) - a missing or fully-occluded finger's predicted landmarks tend to
// collapse toward a small cluster (the model has nothing real to anchor them to) rather than
// spread out to a normal finger's own real length. Deliberately lenient: even the anatomically
// shortest fingers (thumb, pinky) still reach comfortably above this fraction of the palm-length
// reference in every normal hand pose - this is only meant to catch an obviously missing/collapsed
// finger, not to validate exact per-finger proportions. Not yet tested against a real
// missing-finger photo (none was available this session) - expected to get real-device tuned like
// every other approximate ratio here.
export const NAIL_FINGER_PRESENCE_MIN_RATIO = 0.3;

// Where the approximated nail shape starts/ends along its own [nearJoint -> TIP] segment, as a
// fraction of that segment's own length (0 = exactly at the near joint, 1 = exactly at the TIP
// landmark). A real nail plate starts roughly at the last knuckle crease and extends a little
// *past* the TIP landmark itself (the fingertip's own flesh, and then the nail's natural overhang,
// both continue beyond that single point) - `NAIL_END_RATIO > 1` is deliberate, not a typo.
export const NAIL_START_RATIO = 0.5;
export const NAIL_END_RATIO = 1.3;

// The nail shape's width (perpendicular to its own [nearJoint -> TIP] direction), as a fraction of
// that same segment's length - there's no dedicated "finger width" landmark to read this from
// directly, so it's derived from the one length measurement that *is* available. Expected to get
// real-device tuned once rendering, same as every other approximate ratio in this app.
export const NAIL_WIDTH_RATIO = 0.55;

/* ================= GEL - glossy highlight (utils/tryon-utils/nail.ts's `drawGelHighlight`) ======
 * Real gel polish reads as noticeably shinier/glassier than LIQUID's flat fill - this app's flat,
 * lighting-agnostic canvas fill has no real specular-highlight data to lean on directly (same
 * ceiling FACE's own HIGHLIGHTER/COMPACT POWDER already call out for their own finishes), so the
 * shine gets approximated the same way HIGHLIGHTER fakes a cheekbone glow: a small, brighter
 * feathered blob layered on top of the base fill, mixed toward white rather than a fixed absolute
 * highlight color (so it still reads as *this* shade's own gloss, not a generic white blob).
 */

// How far the highlight color gets mixed toward white (0 = unchanged shade, 1 = pure white) -
// same technique/role as FACE's own `HIGHLIGHTER_WHITEN_RATIO`.
export const GEL_HIGHLIGHT_WHITEN_RATIO = 0.75;
// Highlight radius (before the aspect ratio below narrows it) as a fraction of the nail's own
// *length* - a nail is much longer than it is wide, so sizing off the shorter (width) axis would
// either read too small or spill past the nail's own edges once the ellipse is drawn.
export const GEL_HIGHLIGHT_RADIUS_RATIO = 0.32;
// How much narrower the highlight's width-axis radius is than its length-axis one (< 1 = narrower
// than it is long) - a gel sheen reads as a soft streak running along the nail, not a round dot.
export const GEL_HIGHLIGHT_ASPECT_RATIO = 0.55;
// How far off-center, toward the cuticle/base half (not the free-edge/tip), the highlight sits -
// as a fraction of the nail's own half-length. Real gel-manicure photos typically show the
// brightest sheen nearer the base than right at the tip edge.
export const GEL_HIGHLIGHT_OFFSET_RATIO = 0.2;
// Base opacity at the highlight's own dead center, before the caller's `alpha` (intensity slider)
// multiplies in - same fixed-baseline-times-caller-alpha reasoning as FACE's own feathered-blob
// gradient (`drawFeatheredBlob`'s own comment, face.ts).
export const GEL_HIGHLIGHT_BASE_OPACITY = 0.55;

/* ================= DIPPOWDER - desaturated fill (utils/tryon-utils/nail.ts's `drawDipPowderNail`)
 * Real dip powder reads chalkier and less glossy than LIQUID's flat fill - same "no real
 * specular-highlight data to directly dampen" ceiling as GEL above, just the opposite direction:
 * "less shine" gets approximated as reduced color vibrancy, same technique/reasoning as FACE's own
 * COMPACT POWDER (`desaturateTowardGray`'s own comment there, `COMPACTPOWDER_MATTIFY_RATIO`).
 */
export const DIPPOWDER_DESATURATE_RATIO = 0.35;

/* ================= GLITTER - sparkle particles (utils/tryon-utils/nail.ts's `drawGlitterSparkles`)
 * Real glitter polish is a colored base with small reflective flecks suspended in it - the base
 * fill is LIQUID's own flat fill, plus a handful of small, bright sparkle dots scattered across
 * each nail. Positions/sizes come from a *fixed-seed* PRNG, never `Math.random()` - same
 * "deterministic jitter, not per-frame random" reasoning HAIR's own HIGHLIGHTS streak pattern
 * already established (see `NAIL_ORIENTATION_SIGN`'s neighboring HIGHLIGHTS precedent in
 * hair.ts/HIGHLIGHTS.md) - a per-frame-random pattern would flicker to a new arrangement on every
 * single render in Live mode.
 */

// Arbitrary fixed constant - deliberately never derived from anything that could vary frame to
// frame (see this section's own top comment for why), same role as HAIR's own
// `HIGHLIGHTS_STREAK_SEED`.
export const GLITTER_SPARKLE_SEED = 20260215;
// How many sparkle dots get scattered per nail - a real nail is small, so this stays modest (a
// count tuned for a "flecked with glitter" look, not a solid glitter-covered surface).
export const GLITTER_SPARKLE_COUNT = 10;
// Each sparkle's own radius, as a fraction of the nail's own width - randomized per-sparkle between
// these two bounds (see `drawGlitterSparkles`) so flecks read as naturally varied sizes, not
// uniform dots.
export const GLITTER_SPARKLE_MIN_RADIUS_RATIO = 0.04;
export const GLITTER_SPARKLE_MAX_RADIUS_RATIO = 0.09;
// How far each sparkle's own color gets mixed toward white (0 = unchanged shade, 1 = pure white) -
// same technique/role as GEL's own `GEL_HIGHLIGHT_WHITEN_RATIO`, just pushed higher since glitter
// flecks read as small, sharp, near-white glints rather than a soft colored sheen.
export const GLITTER_SPARKLE_WHITEN_RATIO = 0.85;
// Base opacity for a sparkle at its own brightest (before the caller's `alpha` and this sparkle's
// own randomized brightness factor multiply in) - same fixed-baseline-times-caller-alpha reasoning
// as GEL's own `GEL_HIGHLIGHT_BASE_OPACITY`.
export const GLITTER_SPARKLE_BASE_OPACITY = 0.9;

/* ================= CHROME - metallic gradient (utils/tryon-utils/nail.ts's `drawChromeNail`) =====
 * Real chrome polish is mirror-like - without a real lighting/reflection model, this app fakes it
 * the same "static gradient illusion" way HIGHLIGHTS faked balayage: a linear gradient with
 * alternating dark/light bands running along the nail's own length, instead of one flat fill
 * (LIQUID) or a single localized highlight (GEL). This is genuinely new rendering code, not a
 * color-transform-on-top-of-the-existing-fill like GEL/DIPPOWDER/GLITTER all are - see
 * [NAIL-PLAN.md](../../../docs/tryons/NAIL-PLAN.md)'s own build note calling CHROME "sabse
 * uncertain hai... sirf ek static gradient illusion hai".
 */

// Each stop's position along the nail's own length axis (`0` = cuticle/base end, `1` = tip end)
// and how far its color mixes away from the chosen shade - positive mixes toward white
// (`mixTowardWhite`), negative toward black (`mixTowardBlack`), `0` would be the shade unchanged.
// Alternating dark→bright→dark→bright→dark bands is the same "banded reflection" illusion classic
// chrome/metallic gradient effects use elsewhere (e.g. the well-known CSS "chrome text" gradient
// trick) - not derived from any real chrome-polish reference photo, an own judgment call like every
// other approximate constant in this app.
export const CHROME_GRADIENT_STOPS: { offset: number; mix: number }[] = [
  { offset: 0, mix: -0.5 },
  { offset: 0.22, mix: 0.85 },
  { offset: 0.45, mix: -0.35 },
  { offset: 0.68, mix: 0.7 },
  { offset: 1, mix: -0.5 },
];

// Same shape/role as `FACE_RANGE_BOUNDS`/`HAIR_RANGE_BOUNDS` - the intensity slider's bounds, one
// entry per finish.
export const NAIL_RANGE_BOUNDS: Record<TNailFinish, IRangeBounds> = {
  // No reference equivalent (no reference implementation covers nail try-on at all - see
  // docs/tryons/NAIL-PLAN.md's Research section) - own judgment call. Real nail polish reads as
  // fairly opaque even at a modest coat, unlike HAIR's translucent-strand recolor - a flat fill at
  // a mid-high default should already read as "painted", expected to get real-device tuned once
  // rendering.
  LIQUID: { min: 0.4, max: 1, default: 0.85 },
  GEL: { min: 0.4, max: 1, default: 0.85 },
  DIPPOWDER: { min: 0.4, max: 1, default: 0.85 },
  GLITTER: { min: 0.4, max: 1, default: 0.85 },
  CHROME: { min: 0.4, max: 1, default: 0.85 },
};

// Category-wide fallback, deliberately NOT any one finish's own default above - same reasoning as
// `FACE_DEFAULT_RANGE`/`HAIR_DEFAULT_RANGE`. Used only for the brief blank-slate moment before a
// real `type` is known (`NailEngineBase.getInitialState()`).
export const NAIL_DEFAULT_RANGE = 0.85;

/* ================= INSTRUCTIONS =================
 * Shown before a shopper picks/takes a photo - see `getTryOnInstructions` in `./index` for why
 * these are independent per category. NAIL's own real constraint: nails are only visible on the
 * *back* of the hand (dorsal side) - if the palm faces the camera, no nails are visible at all,
 * and hand landmarks alone can't reliably tell which side is showing (see docs/tryons/NAIL-PLAN.md's
 * Open question 1) - so the shopper is asked for the right hand orientation up front instead of
 * the app trying to algorithmically detect a bad one, the same "set the shopper up right" approach
 * FACE_UPLOAD_INSTRUCTIONS/HAIR_UPLOAD_INSTRUCTIONS already take for their own real constraints.
 */

export const NAIL_UPLOAD_INSTRUCTIONS: ITryOnInstruction[] = [
  { icon: 'solar:sun-2-linear', text: 'Good, even lighting - avoid backlight or heavy shadows' },
  { icon: 'solar:radial-blur-linear', text: 'Sharp and in focus, not blurry' },
  {
    icon: 'solar:hand-stars-linear',
    text: 'Back of your hand facing the camera - nails need to be visible, not your palm',
  },
  {
    icon: 'solar:widget-4-linear',
    text: 'Fingers spread apart a little, fully in frame',
  },
];

export const NAIL_LIVE_INSTRUCTIONS: ITryOnInstruction[] = [
  { icon: 'solar:sun-2-linear', text: 'Find good, even lighting - avoid strong backlight' },
  {
    icon: 'solar:hand-stars-linear',
    text: 'Show the back of your hand to the camera - nails need to be visible, not your palm',
  },
  {
    icon: 'solar:videocamera-record-linear',
    text: 'Hold your hand still for a moment so the camera can find your fingers clearly',
  },
  {
    icon: 'solar:widget-4-linear',
    text: 'Spread your fingers apart a little, fully in frame',
  },
];

/* ================= SHADES =================
 * See LIP_SHADES's own comment (lip.ts) for why these are hand-curated here rather than pulled
 * from product data.
 */
export const NAIL_SHADES: Record<TNailFinish, IShade[]> = {
  GEL: [
    { name: 'Classic Red', hexColor: '#B0202E' },
    { name: 'Nude Pink', hexColor: '#E8B9A6' },
    { name: 'Jet Black', hexColor: '#0B0B0B' },
    { name: 'Pure White', hexColor: '#FFFFFF' },
    { name: 'Coral', hexColor: '#F2795D' },
    { name: 'Burgundy', hexColor: '#5C1A2E' },
  ],
  LIQUID: [
    { name: 'Ruby Red', hexColor: '#9B111E' },
    { name: 'Hot Pink', hexColor: '#E6007E' },
    { name: 'Royal Blue', hexColor: '#1E3A8A' },
    { name: 'Emerald Green', hexColor: '#0F6B4C' },
    { name: 'Lavender', hexColor: '#B497D6' },
    { name: 'Classic Nude', hexColor: '#D8A48F' },
  ],
  DIPPOWDER: [
    { name: 'Soft Pink', hexColor: '#F2C6CE' },
    { name: 'French White', hexColor: '#F7F1E8' },
    { name: 'Mauve', hexColor: '#8E5B6D' },
    { name: 'Taupe', hexColor: '#8A7968' },
    { name: 'Berry', hexColor: '#7B2D42' },
  ],
  GLITTER: [
    { name: 'Gold Glitter', hexColor: '#D4AF37' },
    { name: 'Silver Glitter', hexColor: '#C0C0C0' },
    { name: 'Rose Gold Glitter', hexColor: '#B76E79' },
    { name: 'Holographic', hexColor: '#C9C9E8' },
    { name: 'Rainbow Shimmer', hexColor: '#E6A8D7' },
  ],
  CHROME: [
    { name: 'Silver Chrome', hexColor: '#D8D8D8' },
    { name: 'Gold Chrome', hexColor: '#CBA135' },
    { name: 'Rose Gold Chrome', hexColor: '#E0B0A6' },
    { name: 'Lavender Chrome', hexColor: '#C3B1E1' },
    { name: 'Mirror Blue', hexColor: '#8FB8DE' },
  ],
};
