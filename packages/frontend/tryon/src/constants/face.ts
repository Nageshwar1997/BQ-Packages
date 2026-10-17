import type { TFaceFinish } from '../types/face.js';
import type { IRangeBounds, IShade, ITryOnInstruction } from '../types/index.js';

// Face landmark indices (into MediaPipe FaceLandmarker's 478-point face mesh) for the FACE
// Try-On engine. Fresh design (not ported from any reference implementation - see
// docs/tryons/FACE.md) - the index arrays below trace MediaPipe's own standard, publicly
// documented face-mesh topology (face oval, eyes, eyebrows), the same public data every
// MediaPipe-based face-filter app draws from, not anything proprietary. Exact single-point
// anchors (cheek/cheekbone/jaw) are approximate and expected to get visually tuned once
// rendering, same as every other placement constant in this app.

// Outer face boundary, corner-to-corner around the whole face (forehead through jaw) -
// MediaPipe's standard published FACEMESH_FACE_OVAL connector set, already in walk order
// around the face - no convex-hull step needed, unlike a scattered point cloud these trace a
// single closed loop as-is.
export const FACE_OVAL_INDICES = [
  10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365, 379, 378, 400, 377, 152, 148,
  176, 149, 150, 136, 172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109,
];

// `FACE_OVAL_INDICES`' own topmost points sit right at the hairline, not partway up the
// forehead - a full-face fill clipped to the raw oval visibly stops short of covering real
// forehead skin. `applyForeheadExtension` (utils/tryon-utils/face.ts) pushes just the near-top
// points upward by this fraction of the face's own detected height, tapering off by
// `FOREHEAD_EXTENSION_TAPER_RATIO` down from the top so the deformation blends smoothly into
// the unchanged sides/jaw rather than kinking at a hard cutoff. Deliberately conservative -
// overshooting here paints into the hairline instead (hair itself was never covered - no
// landmark data distinguishes hair from skin at all, only real segmentation could), so this
// trades some residual forehead gap for staying clear of hair on most face shapes/hairlines.
export const FOREHEAD_EXTENSION_RATIO = 0.14;
export const FOREHEAD_EXTENSION_TAPER_RATIO = 0.25;

// Eyes/eyebrows/lips - excluded (as holes) from every full-face fill below, so foundation/
// bronzer/etc. never paints over them.
export const LEFT_EYE_INDICES = [
  33, 246, 161, 160, 159, 158, 157, 173, 133, 155, 154, 153, 145, 144, 163, 7,
];
export const RIGHT_EYE_INDICES = [
  362, 398, 384, 385, 386, 387, 388, 466, 263, 249, 390, 373, 374, 380, 381, 382,
];
export const LEFT_EYEBROW_INDICES = [70, 63, 105, 66, 107, 55, 65, 52, 53, 46];
export const RIGHT_EYEBROW_INDICES = [300, 293, 334, 296, 336, 285, 295, 282, 283, 276];
// One ring around the *whole* mouth opening (outer lip boundary, upper arc + lower arc), not
// two separate upper-lip/lower-lip bands - same derivation LIP's own `LIP_OUTER_CONTOUR_INDICES`
// uses (see ./lip.ts), duplicated rather than imported cross-category since these
// are generic face-mesh facts, not LIP business logic (every category's constants file stays
// self-contained). This distinction actually matters here in a way it doesn't for LIP: excluding
// "upper lip band" and "lower lip band" as two *separate* holes only closes the gap between them
// while the mouth is shut - the moment it opens, the space between suddenly isn't inside either
// hole any more, and a full-face fill paints straight over the visible teeth/mouth interior. One
// ring around the outer boundary excludes the whole opening regardless of how wide it is, since
// MediaPipe moves these exact points with the actual jaw/lip position every frame.
const MOUTH_UPPER_OUTER_ARC = [61, 185, 40, 39, 37, 0, 267, 269, 270, 409, 291];
const MOUTH_LOWER_OUTER_ARC = [61, 146, 91, 181, 84, 17, 314, 405, 321, 375, 291];
// Same "outer arc forward, then the other outer arc's first 10 points reversed" derivation as
// LIP_OUTER_CONTOUR_INDICES (see ./lip.ts) - both arcs start at the same left
// corner (61) and run to the same right corner (291), so dropping the lower arc's own trailing
// 291 (already the upper arc's last point) before reversing avoids visiting that corner twice.
export const MOUTH_OUTER_CONTOUR_INDICES = [
  ...MOUTH_UPPER_OUTER_ARC,
  ...MOUTH_LOWER_OUTER_ARC.slice(0, -1).reverse(),
];

// Single-point anchors for the localized (not full-face) finishes - blush/highlighter/contour
// each position a soft blended shape at one of these, not a filled region.
export const CHEEK_APPLE_LEFT_INDEX = 50;
export const CHEEK_APPLE_RIGHT_INDEX = 280;
export const CHEEKBONE_LEFT_INDEX = 116;
export const CHEEKBONE_RIGHT_INDEX = 345;
export const JAW_HOLLOW_LEFT_INDEX = 172;
export const JAW_HOLLOW_RIGHT_INDEX = 397;

// Bottom-center point of each eye's own ring (already part of LEFT_EYE_INDICES/
// RIGHT_EYE_INDICES above) - CONCEALER's under-eye anchor. Not the under-eye hollow itself
// (there's no dedicated landmark for that - MediaPipe's mesh only covers the eyelid margin), so
// `applyConcealerFace` (utils/tryon-utils/face.ts) offsets downward from this point by
// `UNDER_EYE_OFFSET_RATIO` of the face's own height to land in the hollow instead of right on
// the lash line.
export const UNDER_EYE_LEFT_INDEX = 145;
export const UNDER_EYE_RIGHT_INDEX = 374;
export const UNDER_EYE_OFFSET_RATIO = 0.03;

// CONCEALER's own blob shape - wider than tall (unlike BLUSH's plain circular blob), matching
// the real under-eye crescent's shape. `_WIDTH_RATIO` is a fraction of the eye's own detected
// width (not the face's - the under-eye area scales with the eye itself, not overall face
// size), `_ASPECT_RATIO` flattens that circle into an ellipse (`radiusY = radiusX *
// CONCEALER_BLOB_ASPECT_RATIO`).
export const CONCEALER_BLOB_WIDTH_RATIO = 0.65;
export const CONCEALER_BLOB_ASPECT_RATIO = 0.55;

// HIGHLIGHTER's own blob size - notably tighter than BLUSH's broader cheek wash
// (`LOCALIZED_BLOB_RADIUS_RATIO`), since a real highlight sits as a concentrated point at the
// top of the cheekbone rather than a wide flush across the whole cheek. Same face-width-relative
// scaling reasoning as every other size in this app.
export const HIGHLIGHTER_BLOB_RADIUS_RATIO = 0.1;

// How far `applyHighlighterFace` (utils/tryon-utils/face.ts) mixes the chosen shade's color
// toward white before painting it - a real highlighter's whole job is to catch and reflect
// light (read lighter than the product's own swatch color, not as a flat tint of it), which a
// plain color wash at low alpha (BLUSH's approach) can't reproduce on its own. This is a cheap,
// blend-mode-free way to fake that "lightened" look: pure RGB math done before the fill, not a
// canvas blend mode - deliberately avoided after FOUNDATION's own real-device history (see that
// file's bug log) of blend modes over a blank temp canvas being a genuine cross-browser
// inconsistency. 0 would render the shade as-is (BLUSH-like); 1 would render pure white
// regardless of shade - 0.45 keeps the shade's own hue recognizable while still reading
// meaningfully lighter/glowier than a straight wash.
export const HIGHLIGHTER_WHITEN_RATIO = 0.45;

// CONTOUR's anchor offset - `JAW_HOLLOW_LEFT_INDEX`/`JAW_HOLLOW_RIGHT_INDEX` sit right on
// `FACE_OVAL_INDICES`' own boundary (they're part of that same outer loop), not inside the
// hollow of the cheek a real contour shades - `applyContourFace` (utils/tryon-utils/face.ts)
// nudges the anchor inward (toward the face's horizontal center) and upward (toward the cheek
// hollow, above the jawline itself) by these fractions of the face's own width/height, same
// "anchor + offset" pattern CONCEALER's `UNDER_EYE_OFFSET_RATIO` already established.
export const CONTOUR_INWARD_OFFSET_RATIO = 0.04;
export const CONTOUR_UPWARD_OFFSET_RATIO = 0.03;

// CONTOUR's own blob shape - taller than wide (unlike CONCEALER's flatter under-eye ellipse),
// following the jaw hollow's own vertical drop rather than a horizontal crescent.
// `_RADIUS_RATIO` is a fraction of the face's own detected width (medium-sized - bigger than
// HIGHLIGHTER's tight point, smaller than BLUSH's broad cheek wash), `_ASPECT_RATIO` stretches
// that circle taller (`radiusY = radiusX * CONTOUR_BLOB_ASPECT_RATIO`, > 1 this time).
export const CONTOUR_BLOB_RADIUS_RATIO = 0.13;
export const CONTOUR_BLOB_ASPECT_RATIO = 1.4;

// How far `applyContourFace` mixes the chosen shade's color toward black before painting it -
// the mirror image of `HIGHLIGHTER_WHITEN_RATIO`. A real contour product's whole job is to read
// as *shadow* (a hollow catching less light), not just a darker-hued wash of the shade - mixing
// toward black first, rather than leaning on a plain color wash at higher alpha, is what makes
// it read as shading instead of a muddy patch of the shade's own color. 0.35 keeps the shade's
// hue still recognizable while reading clearly darker/shadow-like.
export const CONTOUR_DARKEN_RATIO = 0.35;

// How far `applyBronzerFace` (utils/tryon-utils/face.ts) shifts the chosen shade's color toward
// warm (more red, a touch more green, less blue) before painting it as a full-face wash - a
// temperature-style channel shift rather than mixing toward one fixed absolute bronze color
// (which would flatten every different bronzer shade toward the same hue, the same reasoning
// `HIGHLIGHTER_WHITEN_RATIO`/`CONTOUR_DARKEN_RATIO` already used for why a plain color wash
// alone doesn't read as the real cosmetic effect). `_SHIFT` is the raw per-channel amount at
// full ratio (1.0); `_RATIO` is how much of that actually applies - 0.5 keeps the shade's own
// hue recognizable while still reading meaningfully warmer/sun-kissed than a flat wash.
export const BRONZER_WARM_SHIFT = 35;
export const BRONZER_WARM_RATIO = 0.5;

// The base opacity `applyBbCreamFace` bakes into its own color string - the same role
// FOUNDATION's own fixed 0.6 plays (see `FaceEngineBase.applyEffect`'s `color` line), just
// lower. FACE.md describes BB cream as explicitly "lighter than foundation" - a lower range
// ceiling alone (`FACE_RANGE_BOUNDS.BBCREAM`) only makes that true if nobody ever raises it, so
// this bakes "sheerer than foundation" into the render itself as a structural guarantee, the
// same "don't rely purely on the slider's own bounds" reasoning LIP's `applyStainLips` already
// used (`Math.min(alpha, 0.35)`) to keep STAIN genuinely sheer regardless of what the slider says.
export const BBCREAM_BASE_ALPHA = 0.35;

// How far `applyCompactPowderFace` (utils/tryon-utils/face.ts) desaturates the chosen shade
// toward its own grayscale equivalent before painting it - see that file's `desaturateTowardGray`
// for why a mattifying effect gets approximated this way (this app's flat, lighting-agnostic fill
// has no specular-highlight data to directly dampen, so "less shine" is rendered as "less
// vibrant/saturated" instead - the closest 2D-color-math analogy to a real matte powder's job).
// 0 would render the shade at full saturation (no mattifying at all); 1 would render it fully
// neutral gray, losing the shade's own hue entirely - 0.3 keeps the shade clearly recognizable
// while still reading flatter/less glossy than a straight wash.
export const COMPACTPOWDER_MATTIFY_RATIO = 0.3;

// The base opacity `applyCompactPowderFace` bakes into its own color string - structurally the
// lowest of any full-face FACE finish (lower than even `BBCREAM_BASE_ALPHA`). A real compact
// powder's job is a near-invisible finishing veil (set makeup, knock down shine), not a color
// layer meant to be consciously seen, unlike FOUNDATION's coverage or even BB cream's sheer tint -
// same "bake it into the render, don't rely purely on the slider's own bounds" reasoning
// `BBCREAM_BASE_ALPHA`'s own comment already used.
export const COMPACTPOWDER_BASE_ALPHA = 0.25;

// MediaPipe's standard, widely-documented nose-tip landmark - used (alongside
// CHEEKBONE_LEFT/RIGHT_INDEX above) purely as a head-turn signal, see `isFaceTurnedTooMuch` in
// utils/tryon-utils/face.ts, not for any rendering placement.
export const NOSE_TIP_INDEX = 1;

// How wide a localized blob (blush/highlighter/contour) renders, as a fraction of the face's
// own width (the detected face oval's bounding box) - scales automatically with face size/
// distance from camera instead of a fixed pixel radius, same reasoning as every size in this
// app being derived from the detected face rather than a screen-space constant.
export const LOCALIZED_BLOB_RADIUS_RATIO = 0.16;

// Same shape/role as LIP's own `LIP_RANGE_BOUNDS` - the intensity slider's bounds, one entry per
// finish (not one shared per category) since each finish reads differently at the same raw
// alpha - a slider position that looks right on FOUNDATION's full-face wash can be way too
// strong or too faint on a small localized blob like BLUSH.
export const FACE_RANGE_BOUNDS: Record<TFaceFinish, IRangeBounds> = {
  // Real-device tuned + confirmed (see docs/tryons/FOUNDATION.md) - do not change without
  // re-testing on a real device, same reasoning as FACE_FRAME_EDGE_MARGIN above.
  FOUNDATION: { min: 0.1, max: 0.8, default: 0.2 },
  // Tuned via real-render testing toward a visual peak equivalent to a
  // `{ min: 0, max: 0.15, default: 0.1 }` reading applied directly as the gradient's own alpha -
  // converted here for this app's own alpha convention, which multiplies `state.range` by a fixed
  // 0.6 base first instead (see `drawFeatheredBlob` in utils/tryon-utils/face.ts, the same "0.6
  // base x range" convention FOUNDATION and every LIP finish also use), so hitting that same ~0.15
  // visual peak needs a raw max here around 0.15 / 0.6 = 0.25. Min kept non-zero so the
  // slider can never render an effectively invisible blush - a shopper who wants none can just
  // close the Try-On instead.
  BLUSH: { min: 0.25, max: 1, default: 0.5 },
  // No established convention to derive Concealer's own bounds from - own judgment call.
  // Concealer is meant to read more opaque/pigmented than a sheer blush or
  // foundation wash (its whole job is fully covering a dark circle/blemish, not just tinting),
  // so the ceiling sits notably higher than BLUSH's - 0.9 raw x the fixed 0.6 base
  // (`drawFeatheredBlob`) tops out around 0.54 effective opacity, meaningfully more solid.
  CONCEALER: { min: 0.15, max: 0.9, default: 0.35 },
  // No reference equivalent either. Meant to stay subtle - a highlighter that reads too strong
  // stops looking like light catching the skin and starts looking like a flat pale patch, so the
  // ceiling sits well below both BLUSH's and CONCEALER's. `HIGHLIGHTER_WHITEN_RATIO`
  // (`drawFeatheredBlob`'s caller, `applyHighlighterFace`) already does most of the "make it read
  // as a glow" work, so this doesn't need to lean on a wide alpha range to compensate.
  HIGHLIGHTER: { min: 0.05, max: 0.5, default: 0.25 },
  // No reference equivalent either. Shading needs a genuine, moderate presence to read as a
  // hollow rather than disappear against the skin - notably higher floor than HIGHLIGHTER's
  // (a barely-there contour just looks like a smudge, not shadow), but `CONTOUR_DARKEN_RATIO`
  // still does most of the "read as shadow, not a colored patch" work, so this doesn't need to
  // lean as hard on alpha as CONCEALER's opacity-driven coverage does.
  CONTOUR: { min: 0.1, max: 0.5, default: 0.25 },
  // No reference equivalent either. Same full-face-wash mechanism as FOUNDATION (see
  // `applyBronzerFace`'s own comment), so a similar bounds shape - `BRONZER_WARM_RATIO` already
  // does the "read as a warm glow, not a neutral color-match" work, so this doesn't need a wider
  // range than FOUNDATION's own to compensate.
  BRONZER: { min: 0.08, max: 0.4, default: 0.2 },
  // No reference equivalent either. Same full-face-wash mechanism as FOUNDATION, but
  // `BBCREAM_BASE_ALPHA` already bakes "sheerer than foundation" into the render itself (see its
  // own comment), so this range doesn't need to be dramatically lower than FOUNDATION's own to
  // stay lighter - the two work together, not one compensating for the other missing.
  BBCREAM: { min: 0.08, max: 0.5, default: 0.15 },
  // No reference equivalent either. Same full-face-wash mechanism as FOUNDATION/BRONZER/BBCREAM,
  // but the lowest bounds of any FACE finish - `COMPACTPOWDER_BASE_ALPHA` already bakes "barely-
  // there finishing veil" into the render itself (see its own comment), so this range works
  // together with that baked alpha rather than being the only thing keeping it subtle.
  COMPACTPOWDER: { min: 0.05, max: 0.3, default: 0.12 },
};

// Category-wide fallback, deliberately NOT any one finish's own default above - same reasoning
// as LIP's identical `LIP_DEFAULT_RANGE`. Used only for the brief blank-slate moment before a
// real `type` is known (`FaceEngineBase.getInitialState()`) - picking FOUNDATION's default there
// would be misleading, since it isn't actually FOUNDATION at that point, just "no finish yet".
export const FACE_DEFAULT_RANGE = 0.2;

/* ================= INSTRUCTIONS =================
 * Shown before a shopper picks/takes a photo - see `getTryOnInstructions` in `./index` for why
 * these are independent per category instead of built off one shared base list. The last two
 * tips here (facing the camera directly, hair off the forehead) exist specifically because of
 * how FACE's full-face finishes render (see utils/tryon-utils/face.ts) - a turned head can
 * project part of the face oval past what the camera actually sees (no true 3D/occlusion
 * awareness), and there's no reliable way to tell hair from skin by color alone (see that
 * file's own history) - so the shopper is asked for a good frame up front instead of the app
 * trying to algorithmically fix a bad one after the fact.
 */

export const FACE_UPLOAD_INSTRUCTIONS: ITryOnInstruction[] = [
  { icon: 'solar:sun-2-linear', text: 'Good, even lighting - avoid backlight or heavy shadows' },
  { icon: 'solar:radial-blur-linear', text: 'Sharp and in focus, not blurry' },
  {
    icon: 'solar:user-rounded-linear',
    text: 'Face fully visible, facing the camera directly - not turned to the side',
  },
  {
    icon: 'solar:glasses-linear',
    text: 'No sunglasses, masks, or heavy filters covering your face',
  },
  {
    icon: 'solar:face-scan-circle-linear',
    text: 'Hair pulled back, away from your forehead and face',
  },
];

export const FACE_LIVE_INSTRUCTIONS: ITryOnInstruction[] = [
  { icon: 'solar:sun-2-linear', text: 'Find good, even lighting - avoid strong backlight' },
  { icon: 'solar:user-rounded-linear', text: 'Keep your face centered and clearly visible' },
  {
    icon: 'solar:videocamera-record-linear',
    text: 'Hold still, facing the camera directly - not turned to the side',
  },
  {
    icon: 'solar:glasses-linear',
    text: 'Remove sunglasses, masks, or anything covering your face',
  },
  {
    icon: 'solar:face-scan-circle-linear',
    text: 'Pull hair back, away from your forehead and face',
  },
];

/* ================= SHADES =================
 * See LIP_SHADES's own comment (lip.ts) for why these are hand-curated here rather than pulled
 * from product data. CONCEALER/FOUNDATION/BBCREAM/COMPACTPOWDER span a skin-tone range rather than
 * a color-cosmetic range, since that's what those product types actually come in.
 */
export const FACE_SHADES: Record<TFaceFinish, IShade[]> = {
  CONCEALER: [
    { name: 'Fair', hexColor: '#F3D9C4' },
    { name: 'Light', hexColor: '#EAC3A0' },
    { name: 'Medium', hexColor: '#D9A273' },
    { name: 'Tan', hexColor: '#C17F4E' },
    { name: 'Deep', hexColor: '#8A5A34' },
    { name: 'Golden Beige', hexColor: '#E0B589' },
  ],
  FOUNDATION: [
    { name: 'Porcelain', hexColor: '#F3DCC6' },
    { name: 'Ivory', hexColor: '#EFCBA8' },
    { name: 'Beige', hexColor: '#DDAE82' },
    { name: 'Sand', hexColor: '#C98F5E' },
    { name: 'Honey', hexColor: '#B9793F' },
    { name: 'Caramel', hexColor: '#9C6530' },
    { name: 'Chestnut', hexColor: '#7A4A25' },
    { name: 'Espresso', hexColor: '#4E2E17' },
  ],
  HIGHLIGHTER: [
    { name: 'Champagne', hexColor: '#F0DFC8' },
    { name: 'Rose Gold', hexColor: '#E8B4BC' },
    { name: 'Gold', hexColor: '#D4AF37' },
    { name: 'Pearl', hexColor: '#F5F0E6' },
    { name: 'Bronze', hexColor: '#A9702E' },
  ],
  BLUSH: [
    { name: 'Rosy Pink', hexColor: '#E8A5A5' },
    { name: 'Peach', hexColor: '#F2A261' },
    { name: 'Coral', hexColor: '#F2795D' },
    { name: 'Berry', hexColor: '#9D4E6B' },
    { name: 'Mauve', hexColor: '#B08E9B' },
    { name: 'Terracotta', hexColor: '#C1652B' },
  ],
  CONTOUR: [
    { name: 'Light Tan', hexColor: '#C98F5E' },
    { name: 'Medium Brown', hexColor: '#9C6530' },
    { name: 'Deep Cocoa', hexColor: '#5C3A24' },
    { name: 'Taupe', hexColor: '#8A7968' },
  ],
  BRONZER: [
    { name: 'Golden Bronze', hexColor: '#B5832E' },
    { name: 'Warm Terracotta', hexColor: '#C1652B' },
    { name: 'Deep Bronze', hexColor: '#8C5A2E' },
    { name: 'Sun-kissed Tan', hexColor: '#D9A273' },
  ],
  BBCREAM: [
    { name: 'Fair', hexColor: '#F3D9C4' },
    { name: 'Light', hexColor: '#EAC3A0' },
    { name: 'Medium', hexColor: '#D9A273' },
    { name: 'Tan', hexColor: '#C17F4E' },
    { name: 'Deep', hexColor: '#8A5A34' },
  ],
  COMPACTPOWDER: [
    { name: 'Ivory', hexColor: '#EFCBA8' },
    { name: 'Beige', hexColor: '#DDAE82' },
    { name: 'Sand', hexColor: '#C98F5E' },
    { name: 'Honey', hexColor: '#B9793F' },
    { name: 'Tan', hexColor: '#A9703D' },
  ],
};
