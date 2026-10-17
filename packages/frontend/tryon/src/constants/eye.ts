import type { IEyePatternOption, TEyeFinish } from '../types/eye.js';
import type { IRangeBounds, IShade, ITryOnInstruction } from '../types/index.js';

// Eye landmark indices (into MediaPipe FaceLandmarker's 478-point face mesh) for the EYE Try-On
// engine. Same "self-contained per category" reasoning FACE's own constants file already
// documents (see face.ts's MOUTH_OUTER_CONTOUR_INDICES comment) - these are generic, publicly
// documented face-mesh facts (MediaPipe's standard eye-contour topology), duplicated rather than
// imported from face.ts even though FACE's LEFT_EYE_INDICES/RIGHT_EYE_INDICES cover the same
// points (as a closed ring, used there only for eye-exclusion holes, not an ordered liner path).

// MediaPipe's standard eye ring, split at the two corners into an upper arc (used as the
// lash-line path every EYELINER/KAJAL pattern traces) and a lower arc (KAJAL's waterline,
// EYELINER's Underliner pattern) - both ordered corner-to-corner, not anatomically labeled
// "inner"/"outer" here since that depends on which side of the face this is and gets resolved at
// render time instead (see `orderInnerToOuter` in utils/tryon-utils/eye.ts) - same "don't assume
// which numeric index is anatomically which side, only relative position matters" reasoning
// `isFaceTurnedTooMuch` (face.ts) already uses.
export const LEFT_EYE_UPPER_INDICES = [33, 246, 161, 160, 159, 158, 157, 173, 133];
export const LEFT_EYE_LOWER_INDICES = [133, 155, 154, 153, 145, 144, 163, 33];
export const RIGHT_EYE_UPPER_INDICES = [362, 398, 384, 385, 386, 387, 388, 466, 263];
export const RIGHT_EYE_LOWER_INDICES = [263, 249, 390, 373, 374, 380, 381, 382, 362];

// MediaPipe's standard eyebrow ring - a real, directly-tracked closed loop (unlike EYESHADOW's
// own synthesized crease line), same 10 points FACE's own `LEFT_EYEBROW_INDICES`/
// `RIGHT_EYEBROW_INDICES` use for its full-face washes' exclusion holes - duplicated rather than
// imported per this file's own self-contained-per-category rule (see this section's own opening
// comment), PLUS one extra tail-side point (156 left / 383 right) appended at the end - surfaced by
// researching MediaPipe's own 478-point face mesh topology directly and confirmed against a real
// render (added symmetrically to both sides here, rather than swapped in for an existing point, so
// the two rings stay structurally identical). That one real
// landmark is what actually gives the tail its correct real-world extent - not a synthesized
// margin - confirmed directly against a real render once added. Ordered continuously around the
// loop (first half traces one edge, second half returns along the other, with the extra tail point
// bridging the two) - EYEBROW's own renderer (utils/tryon-utils/eye.ts) splits it into the two
// edges directly by array position rather than re-deriving them, and determines inner (nasal) vs
// outer (temporal/tail) by comparing each point's own x-distance to the nose tip at render time,
// same "don't assume which numeric index is anatomically which side" reasoning `orderInnerToOuter`
// already uses for the eye rings above.
export const LEFT_EYEBROW_INDICES = [70, 63, 105, 66, 107, 55, 65, 52, 53, 46, 156];
export const RIGHT_EYEBROW_INDICES = [300, 293, 334, 296, 336, 285, 295, 282, 283, 276, 383];

// Same nose-tip landmark FACE's own `isFaceTurnedTooMuch` uses, duplicated here per this file's
// own self-contained-per-category rule - used purely to tell which end of an eye's upper/lower
// arc is the inner (nasal) corner vs the outer (temporal) one, by comparing x-distance, rather
// than trusting a specific numeric index to always mean "inner" regardless of which eye/side.
export const NOSE_TIP_INDEX = 1;

// Same two cheekbone landmarks + reasoning as FACE's own `CHEEKBONE_LEFT_INDEX`/
// `CHEEKBONE_RIGHT_INDEX` (constants/tryon-constants/face.ts), duplicated here per this file's own
// self-contained-per-category rule - `isEyeTurnedTooMuch` (utils/tryon-utils/eye.ts) uses these
// purely as a head-turn signal (how symmetric each cheekbone's distance to the nose tip stays),
// the exact same generic face-pose check FACE's own `isFaceTurnedTooMuch` already established.
export const CHEEKBONE_LEFT_INDEX = 116;
export const CHEEKBONE_RIGHT_INDEX = 345;

/* ================= SHARED STROKE-TUNING SHAPE =================================================
 * EYELINER and KAJAL (see their own sections below) are both the *same* tapered-stroke primitive
 * (utils/tryon-utils/eye.ts's `renderTaperedStrokeForEye`) - one continuous filled path along an
 * eye-ring arc, thin near the inner corner, thicker near the outer, optionally extended past the
 * outer corner with a curved "wing", optionally blurred. `KAJAL`'s own build note in
 * docs/tryons/EYE-PLAN.md says as much explicitly ("no new code beyond parameter tuning once the
 * shared primitive exists") - so both finishes' own per-pattern tuning tables share one interface
 * shape rather than each declaring a near-identical one, and the render function itself takes a
 * resolved tuning object rather than a finish-specific pattern id, so it has no idea which finish
 * is even calling it.
 *
 * Every ratio below is relative to the eye's own detected width (inner-to-outer corner distance
 * in pixel space) - same "scale off the feature's own size, not a fixed pixel constant" reasoning
 * every other placement/size constant in this app already follows (e.g. FACE's
 * CONCEALER_BLOB_WIDTH_RATIO).
 */

export interface IEyeWingTuning {
  lengthRatio: number;
  angleDeg: number;
  curveRatio: number;
}

export interface IEyeStrokePatternTuning {
  baseWidthRatio: number;
  peakWidthRatio: number;
  tipWidthRatio: number;
  wing?: IEyeWingTuning;
  secondWing?: IEyeWingTuning;
  blurRatio?: number;
  // EYELINER-only (its Underliner pattern adds a second pass tracing the *other* arc) - left
  // optional on the shared shape rather than a separate KAJAL-less interface, same "unused
  // optional fields are fine" convention every other per-finish tuning record in this app follows
  // (e.g. FACE finishes' own tuning records don't each get a bespoke interface either).
  underlinerWidthRatio?: number;
}

/* ================= EYELINER ====================================================================
 * 7 patterns. See docs/tryons/EYE-PLAN.md for the full design reasoning and docs/tryons/
 * EYELINER.md for this finish's own tracker. Starting values, ported from the same proportions
 * used to build the 7 pattern-preview icons (images/eye/eyeliner/ of the assets package) on a fixed 500px
 * canvas (360px eye-width there) - expected to get visually tuned once rendering, same as every
 * other placement constant in this app.
 */

export type TEyelinerPattern =
  | 'CLASSIC_THIN'
  | 'BOLD_THICK'
  | 'WINGED_CAT_EYE'
  | 'DOUBLE_WING'
  | 'SMOKEY_SMUDGED'
  | 'TIGHTLINE'
  | 'UNDERLINER';

export const EYELINER_PATTERNS: IEyePatternOption[] = [
  {
    id: 'CLASSIC_THIN',
    label: 'Classic Thin',
    image: 'images/eye/eyeliner/Classic-Thin.webp',
  },
  {
    id: 'BOLD_THICK',
    label: 'Bold / Thick',
    image: 'images/eye/eyeliner/Bold-Thick.webp',
  },
  {
    id: 'WINGED_CAT_EYE',
    label: 'Winged / Cat-eye',
    image: 'images/eye/eyeliner/Winged-Cat-Eye.webp',
  },
  {
    id: 'DOUBLE_WING',
    label: 'Double Wing',
    image: 'images/eye/eyeliner/Double-Wing.webp',
  },
  {
    id: 'SMOKEY_SMUDGED',
    label: 'Smokey / Smudged',
    image: 'images/eye/eyeliner/Smokey-Smudged.webp',
  },
  { id: 'TIGHTLINE', label: 'Tightline', image: 'images/eye/eyeliner/Tightline.webp' },
  { id: 'UNDERLINER', label: 'Underliner', image: 'images/eye/eyeliner/Underliner.webp' },
];

// The pattern a fresh EYELINER selection starts on before the shopper picks one explicitly -
// same "blank-slate needs *a* value" reasoning as LIP_DEFAULT_RANGE/FACE_DEFAULT_RANGE, just for
// `pattern` instead of `range`. Classic Thin, the least visually aggressive option, so a shopper
// who never touches the pattern picker still gets a tasteful default rather than nothing.
export const EYELINER_DEFAULT_PATTERN: TEyelinerPattern = 'CLASSIC_THIN';

// `baseWidthRatio` (the inner-corner end) used to sit at roughly 40-55% of `peakWidthRatio` -
// mathematically a smooth taper, but on a real photo (eye width ~110-150px at typical canvas
// resolutions) that worked out to only ~2-3px, thin enough to read as "no liner there at all"
// against real eyelash texture - the finish looked like it stopped short of the inner corner
// even though it was technically still drawing something. Bumped to ~70-80% of peak across every
// pattern (a much gentler taper, closer to how real eyeliner actually reads - fairly consistent
// thickness along the lash line, with the dramatic width change concentrated in the wing/flick
// itself, not the base) - found via a real-photo pixel-level check, not just the synthetic
// fixture (which, at a smaller test canvas, never made the base thin enough in absolute pixels to
// expose this).
export const EYELINER_PATTERN_TUNING: Record<TEyelinerPattern, IEyeStrokePatternTuning> = {
  CLASSIC_THIN: { baseWidthRatio: 0.032, peakWidthRatio: 0.042, tipWidthRatio: 0.042 },
  BOLD_THICK: { baseWidthRatio: 0.062, peakWidthRatio: 0.09, tipWidthRatio: 0.09 },
  WINGED_CAT_EYE: {
    baseWidthRatio: 0.032,
    peakWidthRatio: 0.06,
    tipWidthRatio: 0,
    wing: { lengthRatio: 0.194, angleDeg: 24, curveRatio: 0.039 },
  },
  DOUBLE_WING: {
    baseWidthRatio: 0.032,
    peakWidthRatio: 0.06,
    tipWidthRatio: 0,
    wing: { lengthRatio: 0.194, angleDeg: 24, curveRatio: 0.039 },
    secondWing: { lengthRatio: 0.153, angleDeg: 12, curveRatio: 0.028 },
  },
  SMOKEY_SMUDGED: {
    baseWidthRatio: 0.085,
    peakWidthRatio: 0.15,
    tipWidthRatio: 0.15,
    blurRatio: 0.044,
  },
  TIGHTLINE: { baseWidthRatio: 0.016, peakWidthRatio: 0.016, tipWidthRatio: 0.016 },
  UNDERLINER: {
    baseWidthRatio: 0.032,
    peakWidthRatio: 0.042,
    tipWidthRatio: 0.042,
    underlinerWidthRatio: 0.028,
  },
};

/* ================= KAJAL =======================================================================
 * 4 patterns, the exact same tapered-stroke primitive EYELINER uses (see the shared-shape comment
 * above) - the only structural difference is *which* arc it traces: kajal sits on the lower
 * lash-line/waterline, not the upper one, so `applyKajalEye` (utils/tryon-utils/eye.ts) passes
 * `LEFT/RIGHT_EYE_LOWER_INDICES` as the primary arc instead of the upper ones EYELINER uses. See
 * docs/tryons/EYE-PLAN.md for the full design reasoning and docs/tryons/KAJAL.md for this finish's
 * own tracker. Ratios ported from the same proportions used to build the 4 pattern-preview icons
 * (images/eye/kajal/ of the assets package) on a fixed 500px canvas (420px eye-width there).
 */

export type TKajalPattern =
  'THIN_WATERLINE' | 'TIGHTLINE_LOWER_LASH' | 'SMUDGED_SMOKEY' | 'FULL_BOLD_KOHL';

export const KAJAL_PATTERNS: IEyePatternOption[] = [
  {
    id: 'THIN_WATERLINE',
    label: 'Thin Waterline',
    image: 'images/eye/kajal/Thin-Waterline.webp',
  },
  {
    id: 'TIGHTLINE_LOWER_LASH',
    label: 'Tightline Lower Lash',
    image: 'images/eye/kajal/Tightline-Lower-Lash.webp',
  },
  {
    id: 'SMUDGED_SMOKEY',
    label: 'Smudged / Smokey',
    image: 'images/eye/kajal/Smudged-Smokey-Kajal.webp',
  },
  {
    id: 'FULL_BOLD_KOHL',
    label: 'Full Bold Kohl',
    image: 'images/eye/kajal/Full-Bold-Kohl.webp',
  },
];

// Same "tasteful default rather than nothing" reasoning as `EYELINER_DEFAULT_PATTERN` - Thin
// Waterline, the most universally-flattering/subtle of the 4, rather than jumping straight to
// Full Bold Kohl.
export const KAJAL_DEFAULT_PATTERN: TKajalPattern = 'THIN_WATERLINE';

// No `wing` on any of these - kajal's own "extending slightly past the outer corner" (Full Bold
// Kohl) is a much shorter flick than EYELINER's Winged/Double Wing, close enough to a plain wider
// tip that it's handled by `tipWidthRatio` alone rather than `buildWingPoints`, keeping this table
// (and `renderTaperedStrokeForEye`'s call for it) exactly as simple as EYE-PLAN.md's own build
// note promised ("no new code beyond parameter tuning").
export const KAJAL_PATTERN_TUNING: Record<TKajalPattern, IEyeStrokePatternTuning> = {
  THIN_WATERLINE: { baseWidthRatio: 0.026, peakWidthRatio: 0.034, tipWidthRatio: 0.03 },
  TIGHTLINE_LOWER_LASH: { baseWidthRatio: 0.014, peakWidthRatio: 0.016, tipWidthRatio: 0.014 },
  SMUDGED_SMOKEY: {
    baseWidthRatio: 0.05,
    peakWidthRatio: 0.07,
    tipWidthRatio: 0.06,
    blurRatio: 0.05,
  },
  FULL_BOLD_KOHL: { baseWidthRatio: 0.055, peakWidthRatio: 0.07, tipWidthRatio: 0.08 },
};

/* ================= EYESHADOW ===================================================================
 * 6 patterns - the first EYE finish that washes a whole *region* (the eyelid, lash line up to the
 * crease) rather than tracing a thin line the way EYELINER/KAJAL do. No dedicated MediaPipe
 * landmark ring exists for the crease itself (only the lash-line ring and the eyebrow ring are
 * real tracked points) - the "crease" used below is synthesized by offsetting the upper lash-line
 * arc upward (the exact same `outwardNormalsAlongPath` direction-math EYELINER/KAJAL already use
 * for their own width offset, just repurposed here for a much larger, region-sized offset instead
 * of a stroke width) - same "approximate off a real landmark rather than inventing a new tracked
 * point" reasoning `applyForeheadExtension` (face.ts) already uses for FOUNDATION's own
 * hairline-to-forehead extension. See docs/tryons/EYE-PLAN.md for the full design reasoning and
 * docs/tryons/EYESHADOW.md for this finish's own tracker.
 *
 * Every ratio below is relative to the eye's own detected width, same convention EYELINER/KAJAL
 * already use.
 */

export type TEyeshadowPattern =
  | 'SINGLE_WASH'
  | 'TWO_TONE_GRADIENT'
  | 'SMOKEY_EYE'
  | 'CUT_CREASE'
  | 'HALO_EYE'
  | 'UNDER_EYE_SMUDGE';

export const EYESHADOW_PATTERNS: IEyePatternOption[] = [
  {
    id: 'SINGLE_WASH',
    label: 'Single Wash',
    image: 'images/eye/eyeshadow/Single-Wash.webp',
  },
  {
    id: 'TWO_TONE_GRADIENT',
    label: 'Two-Tone Gradient',
    image: 'images/eye/eyeshadow/Two-Tone-Gradient.webp',
  },
  {
    id: 'SMOKEY_EYE',
    label: 'Smokey Eye',
    image: 'images/eye/eyeshadow/Smokey-Eye.webp',
  },
  {
    id: 'CUT_CREASE',
    label: 'Cut Crease',
    image: 'images/eye/eyeshadow/Cut-Crease.webp',
  },
  {
    id: 'HALO_EYE',
    label: 'Halo Eye',
    image: 'images/eye/eyeshadow/Halo-Eye.webp',
  },
  {
    id: 'UNDER_EYE_SMUDGE',
    label: 'Under-Eye Smudge',
    image: 'images/eye/eyeshadow/Under-Eye-Smudge.webp',
  },
];

// Same "tasteful default rather than nothing" reasoning as EYELINER/KAJAL's own defaults - a flat
// single-color wash is the least visually aggressive of the 6, and the one every other pattern is
// itself built on top of.
export const EYESHADOW_DEFAULT_PATTERN: TEyeshadowPattern = 'SINGLE_WASH';

export interface IEyeshadowPatternTuning {
  // Peak height the wash reaches above the lash line (mid-lid), ratio of eyeWidth.
  bandHeightRatio: number;
  // Shapes the band's own height curve across `t` (`Math.sin(Math.PI * t) ** peakSharpness`,
  // 0 at both corners either way) - 1 is a plain smooth arch, below 1 flattens the top into a
  // wider plateau (more coverage across the lid, not just a peak in the middle), above 1
  // narrows it into a tighter peak. Replaces a separate fixed "taper zone" ratio - one knob
  // shapes the whole curve instead of two describing a flat-middle-plus-ramped-ends shape.
  peakSharpness: number;
  // Soft/feathered edge - `ctx.filter` blur, same technique EYELINER's own Smokey/Smudged
  // patterns already established.
  blurRatio?: number;
  // Smokey Eye/Under-Eye Smudge only - a second, shorter, less-blurred band hugging the lash
  // line on top of the soft main wash, for the "concentrated dark near the lash line" look.
  concentratedHeightRatio?: number;
  concentratedPeakSharpness?: number;
  // Two-Tone Gradient/Halo Eye only - how far toward white the lighter tone leans
  // (`mixTowardWhite`, same per-channel math FACE's own HIGHLIGHTER_WHITEN_RATIO uses).
  highlightRatio?: number;
  // Cut Crease/Halo Eye only - how far toward black the darker tone leans (`mixTowardBlack`,
  // same math FACE's own CONTOUR_DARKEN_RATIO uses).
  darkenRatio?: number;
  // Cut Crease only - width of the crisp stroke traced exactly along the synthesized crease line.
  creaseLineWidthRatio?: number;
  // Under-Eye Smudge only - how far below the lower lash line the smudge extends, and its own
  // blur (EYELINER's own Underliner pattern is the same "second pass on the other arc" idea).
  underSmudgeHeightRatio?: number;
  underSmudgeBlurRatio?: number;
}

export const EYESHADOW_PATTERN_TUNING: Record<TEyeshadowPattern, IEyeshadowPatternTuning> = {
  SINGLE_WASH: { bandHeightRatio: 0.34, peakSharpness: 0.6 },
  TWO_TONE_GRADIENT: { bandHeightRatio: 0.4, peakSharpness: 0.6, highlightRatio: 0.4 },
  SMOKEY_EYE: {
    bandHeightRatio: 0.36,
    peakSharpness: 0.6,
    blurRatio: 0.05,
    concentratedHeightRatio: 0.15,
    concentratedPeakSharpness: 1.4,
  },
  CUT_CREASE: {
    bandHeightRatio: 0.34,
    peakSharpness: 0.5,
    darkenRatio: 0.3,
    creaseLineWidthRatio: 0.02,
  },
  HALO_EYE: {
    bandHeightRatio: 0.36,
    peakSharpness: 0.6,
    highlightRatio: 0.5,
    darkenRatio: 0.25,
  },
  UNDER_EYE_SMUDGE: {
    bandHeightRatio: 0.32,
    peakSharpness: 0.6,
    blurRatio: 0.06,
    concentratedHeightRatio: 0.13,
    concentratedPeakSharpness: 1.4,
    underSmudgeHeightRatio: 0.12,
    underSmudgeBlurRatio: 0.05,
  },
};

/* ================= EYEBROW ======================================================================
 * 5 patterns - the first EYE finish built on a *real, directly-tracked* closed region
 * (`LEFT/RIGHT_EYEBROW_INDICES` above) rather than a stroke along an arc (EYELINER/KAJAL) or a
 * synthesized region (EYESHADOW's own crease line). Two are plain closed-region fills (Bold/
 * Defined, Soft Powder) or a fill with a gradient (Ombre); the other two (Natural Hair-Stroke,
 * Feathered/Fluffy) draw many individual short strokes across the region instead of one flat
 * fill, for a hair-like texture - procedural (canvas path math, deterministic per-stroke jitter),
 * not a texture image asset, keeping this consistent with every other EYE finish's own "pure
 * landmark + canvas math, no runtime image assets" approach (only the *pattern-preview icons* are
 * images, generated once and shipped, same as every other EYE finish's own icon set). See
 * docs/tryons/EYE-PLAN.md for the full design reasoning and docs/tryons/EYEBROW.md for this
 * finish's own tracker.
 *
 * Ratios below are relative to the eyebrow's own detected width (inner-to-outer/tail distance),
 * same convention every other EYE finish already uses.
 */

export type TEyebrowPattern =
  | 'NATURAL_HAIR_STROKE'
  | 'SOFT_POWDER_FILL'
  | 'BOLD_DEFINED_FILL'
  | 'OMBRE_BROW'
  | 'FEATHERED_FLUFFY';

export const EYEBROW_PATTERNS: IEyePatternOption[] = [
  {
    id: 'NATURAL_HAIR_STROKE',
    label: 'Natural Hair-Stroke',
    image: 'images/eye/eyebrow/Natural-Hair-Stroke.webp',
  },
  {
    id: 'SOFT_POWDER_FILL',
    label: 'Soft Powder Fill',
    image: 'images/eye/eyebrow/Soft-Powder-Fill.webp',
  },
  {
    id: 'BOLD_DEFINED_FILL',
    label: 'Bold / Defined Fill',
    image: 'images/eye/eyebrow/Bold-Defined-Fill.webp',
  },
  {
    id: 'OMBRE_BROW',
    label: 'Ombre Brow',
    image: 'images/eye/eyebrow/Ombre-Brow.webp',
  },
  {
    id: 'FEATHERED_FLUFFY',
    label: 'Feathered / Fluffy',
    image: 'images/eye/eyebrow/Feathered-Fluffy.webp',
  },
];

// Same "tasteful default rather than nothing" reasoning as every other EYE finish's own default -
// Soft Powder Fill, the most universally-flattering/subtle of the 5 (a defined block or visible
// hair-strokes both read as more of a styling choice than a safe starting point).
export const EYEBROW_DEFAULT_PATTERN: TEyebrowPattern = 'SOFT_POWDER_FILL';

export interface IEyebrowPatternTuning {
  // Soft Powder Fill only - diffused edges, same `ctx.filter` blur technique every other EYE
  // finish's own soft pattern already uses.
  blurRatio?: number;
  // Ombre Brow only - `mixTowardWhite`/`mixTowardBlack` ratios for the lighter front-end tone and
  // the bolder tail-end tone of its own gradient (same per-channel math EYESHADOW ported from
  // FACE's HIGHLIGHTER/CONTOUR).
  highlightRatio?: number;
  darkenRatio?: number;
  // Natural Hair-Stroke/Feathered Fluffy only - presence of `strokeCount` is what this file's
  // renderer (utils/tryon-utils/eye.ts) dispatches on to pick the hair-stroke code path over the
  // plain closed-region fill one.
  strokeCount?: number;
  // Degrees the strokes lean away from the brow's own local growth direction, toward straight up
  // - 0 reads as hairs lying flat along the brow's natural line (Natural Hair-Stroke), a larger
  // value reads as hairs brushed upward (Feathered/Fluffy's own "soap-brow" look).
  strokeAngleBiasDeg?: number;
  strokeWidthRatio?: number;
}

export const EYEBROW_PATTERN_TUNING: Record<TEyebrowPattern, IEyebrowPatternTuning> = {
  BOLD_DEFINED_FILL: {},
  SOFT_POWDER_FILL: { blurRatio: 0.05 },
  OMBRE_BROW: { highlightRatio: 0.35, darkenRatio: 0.18 },
  NATURAL_HAIR_STROKE: { strokeCount: 46, strokeAngleBiasDeg: 10, strokeWidthRatio: 0.045 },
  FEATHERED_FLUFFY: { strokeCount: 40, strokeAngleBiasDeg: 32, strokeWidthRatio: 0.05 },
};

/* ================= SHARED LASH-STROKE TUNING SHAPE =============================================
 * MASCARA and LASHES (see their own sections below) are both the *same* lash-stroke primitive
 * (utils/tryon-utils/eye.ts's `renderLashStrokesForEye`) - many small curved strokes generated
 * along the upper lash line, each one thick at the root and tapering to a fine tip (the exact same
 * `fillTaperedPath` ribbon primitive every other stroke-based EYE finish already shares), curving
 * from its own root direction toward straight-up over its own length instead of running straight -
 * same "blend a direction toward absolute up" technique EYEBROW's own `strokeAngleBiasDeg` already
 * uses for its Feathered/Fluffy pattern, reused here for lash *curl* instead of brow-hair lean.
 * Procedural (canvas path math, deterministic per-stroke jitter via the same `strokeJitter` hash
 * EYEBROW's own hair-strokes use), not a texture image asset - same "pure landmark + canvas math"
 * approach every EYE finish's actual rendering already follows, and a deliberate departure from
 * EYE-PLAN.md's own original speculation that LASHES would likely need a texture-asset pipeline
 * instead (written before MASCARA's own lash-stroke primitive existed to reuse) - see
 * docs/tryons/LASHES.md's own design notes for why extending the existing procedural primitive
 * turned out cleaner than sourcing/warping actual lash-strip art once MASCARA had already proven
 * the math out. Same "one interface shape shared instead of two near-identical ones" reasoning
 * `IEyeStrokePatternTuning` already established for EYELINER/KAJAL.
 *
 * Ratios below are relative to the eye's own detected width, same convention every other EYE
 * finish already uses.
 */

export interface ILashStrokeTuning {
  strokeCount: number;
  strokeWidthRatio: number;
  strokeLengthRatio: number;
  // 0 = each lash runs perfectly straight along its own root (outward-normal) direction, 1 = it
  // curls all the way to straight-up by its own tip regardless of where its root pointed.
  curlFraction: number;
  // Extra outward rotation applied to each lash's own root direction, scaled by how far along the
  // lash line it sits (0 at the inner corner, full amount at the outer) - the "fanned out toward
  // the temple" look (MASCARA's own Dramatic/Length, LASHES' own Winged).
  fanOutDeg?: number;
  // LASHES only - modulates each stroke's own base length by position along the lash line, on top
  // of its usual per-stroke jitter: `ramp-outer` grows monotonically toward the outer corner
  // (Winged), `peak-center` is tallest at the horizontal middle and shorter at both corners
  // (Doll-eye) - the same sine-arch shape EYESHADOW's own `eyelidBandHeight` already uses for
  // "tall in the middle, tapering at both ends", reused here for length instead of band height.
  // Omitted entirely means every stroke targets the same base length (every MASCARA pattern, and
  // LASHES' own Natural/Everyday, Wispy, Dramatic/Voluminous).
  lengthShape?: { kind: 'ramp-outer' | 'peak-center'; amount: number };
  // LASHES' own Wispy only - extra per-stroke length jitter on top of the baseline every lash
  // already gets, for a genuinely irregular (not just longer/shorter by position) feathered look.
  extraLengthJitter?: number;
}

/* ================= MASCARA ======================================================================
 * 4 patterns - the first EYE finish needing the lash-stroke primitive above (no reuse from
 * LIP/FACE, per EYE-PLAN.md's own build note). See docs/tryons/EYE-PLAN.md for the full design
 * reasoning and docs/tryons/MASCARA.md for this finish's own tracker.
 */

export type TMascaraPattern = 'NATURAL' | 'VOLUMIZING' | 'DRAMATIC_LENGTH' | 'CURLED';

export const MASCARA_PATTERNS: IEyePatternOption[] = [
  { id: 'NATURAL', label: 'Natural', image: 'images/eye/mascara/Natural.webp' },
  { id: 'VOLUMIZING', label: 'Volumizing', image: 'images/eye/mascara/Volumizing.webp' },
  {
    id: 'DRAMATIC_LENGTH',
    label: 'Dramatic / Length',
    image: 'images/eye/mascara/Dramatic-Length.webp',
  },
  { id: 'CURLED', label: 'Curled', image: 'images/eye/mascara/Curled.webp' },
];

// Same "tasteful default rather than nothing" reasoning as every other EYE finish's own default -
// Natural, the least visually aggressive of the 4.
export const MASCARA_DEFAULT_PATTERN: TMascaraPattern = 'NATURAL';

export const MASCARA_PATTERN_TUNING: Record<TMascaraPattern, ILashStrokeTuning> = {
  NATURAL: {
    strokeCount: 32,
    strokeWidthRatio: 0.016,
    strokeLengthRatio: 0.09,
    curlFraction: 0.15,
  },
  VOLUMIZING: {
    strokeCount: 52,
    strokeWidthRatio: 0.026,
    strokeLengthRatio: 0.1,
    curlFraction: 0.2,
  },
  DRAMATIC_LENGTH: {
    strokeCount: 36,
    strokeWidthRatio: 0.018,
    strokeLengthRatio: 0.16,
    curlFraction: 0.25,
    fanOutDeg: 18,
  },
  CURLED: { strokeCount: 36, strokeWidthRatio: 0.018, strokeLengthRatio: 0.1, curlFraction: 0.55 },
};

/* ================= LASHES (false-lash styles) ==================================================
 * 5 patterns, the exact same lash-stroke primitive MASCARA uses (see the shared-shape comment
 * above) - the only new capability needed was per-position length shaping (`lengthShape`) for
 * Winged/Doll-eye and extra length jitter (`extraLengthJitter`) for Wispy, both added to the
 * shared tuning interface rather than forking a second one. See docs/tryons/EYE-PLAN.md for the
 * full design reasoning and docs/tryons/LASHES.md for this finish's own tracker (including why
 * this ended up procedural rather than the texture-asset approach EYE-PLAN.md originally guessed
 * at).
 */

export type TLashesPattern =
  'NATURAL_EVERYDAY' | 'WISPY' | 'DRAMATIC_VOLUMINOUS' | 'WINGED' | 'DOLL_EYE';

export const LASHES_PATTERNS: IEyePatternOption[] = [
  {
    id: 'NATURAL_EVERYDAY',
    label: 'Natural / Everyday',
    image: 'images/eye/lashes/Natural-Everyday.webp',
  },
  { id: 'WISPY', label: 'Wispy', image: 'images/eye/lashes/Wispy.webp' },
  {
    id: 'DRAMATIC_VOLUMINOUS',
    label: 'Dramatic / Voluminous',
    image: 'images/eye/lashes/Dramatic-Voluminous.webp',
  },
  { id: 'WINGED', label: 'Winged', image: 'images/eye/lashes/Winged.webp' },
  { id: 'DOLL_EYE', label: 'Doll-Eye', image: 'images/eye/lashes/Doll-Eye.webp' },
];

// Same "tasteful default rather than nothing" reasoning as every other EYE finish's own default -
// Natural/Everyday, the least visually aggressive of the 5.
export const LASHES_DEFAULT_PATTERN: TLashesPattern = 'NATURAL_EVERYDAY';

export const LASHES_PATTERN_TUNING: Record<TLashesPattern, ILashStrokeTuning> = {
  NATURAL_EVERYDAY: {
    strokeCount: 34,
    strokeWidthRatio: 0.017,
    strokeLengthRatio: 0.095,
    curlFraction: 0.18,
  },
  WISPY: {
    strokeCount: 28,
    strokeWidthRatio: 0.015,
    strokeLengthRatio: 0.11,
    curlFraction: 0.2,
    extraLengthJitter: 0.5,
  },
  DRAMATIC_VOLUMINOUS: {
    strokeCount: 58,
    strokeWidthRatio: 0.029,
    strokeLengthRatio: 0.13,
    curlFraction: 0.25,
  },
  WINGED: {
    strokeCount: 38,
    strokeWidthRatio: 0.02,
    strokeLengthRatio: 0.1,
    curlFraction: 0.22,
    fanOutDeg: 22,
    lengthShape: { kind: 'ramp-outer', amount: 0.9 },
  },
  DOLL_EYE: {
    strokeCount: 38,
    strokeWidthRatio: 0.02,
    strokeLengthRatio: 0.1,
    curlFraction: 0.2,
    lengthShape: { kind: 'peak-center', amount: 0.6 },
  },
};

/* ================= BROWGEL ======================================================================
 * No pattern picker - color/alpha only (see EYE-PLAN.md's own reasoning: a brow gel's whole job is
 * setting/tinting the hairs already there, it has no distinct "shape" variants the way a liner or
 * eyeshadow does, so forcing a pattern dimension onto it wouldn't match any real product). Reuses
 * EYEBROW's own closed-region fill primitive directly (`fillEyebrowRegion` in utils/tryon-utils/
 * eye.ts) with one fixed tuning value instead of a per-pattern lookup table - a sheer, softly
 * blurred wash over the same eyebrow ring, one setting rather than five to choose between.
 */
export const BROWGEL_TUNING: IEyebrowPatternTuning = { blurRatio: 0.035 };

// Which pattern id a shopper lands on the moment they open a given pattern-bearing EYE finish,
// before they've touched the picker themselves - `EyeEngineBase.applyEffect` falls back to this
// (keyed by `state.type`) whenever `state.pattern` is still unset, and `TryOnModal` uses the same
// map so the picker's own "currently applied" swatch matches what's actually being rendered from
// the very first frame. Three entries now - each finish's pattern ids are their own separate
// namespace (KAJAL's `THIN_WATERLINE` means nothing looked up against `EYELINER_PATTERN_TUNING`,
// EYESHADOW's `SINGLE_WASH` means nothing looked up against either), so a single flat default
// would be wrong for whichever finish it wasn't written for.
export const EYE_DEFAULT_PATTERNS: Partial<Record<TEyeFinish, string>> = {
  EYELINER: EYELINER_DEFAULT_PATTERN,
  KAJAL: KAJAL_DEFAULT_PATTERN,
  EYESHADOW: EYESHADOW_DEFAULT_PATTERN,
  EYEBROW: EYEBROW_DEFAULT_PATTERN,
  MASCARA: MASCARA_DEFAULT_PATTERN,
  LASHES: LASHES_DEFAULT_PATTERN,
};

// Which EYE finishes have a pattern picker at all, and which option list to show for each -
// `Partial` on purpose, same reasoning as `TRY_ON_INSTRUCTIONS` (constants/tryon-constants/
// index.ts): a finish without its own dedicated rendering yet (or one that's color-only by
// design, like BROWGEL - see EYE-PLAN.md) has no real pattern list to show. `TryOnModal` reads
// this to decide whether to render `TryOnPatternSwatches` at all for the current subCategory.
export const EYE_PATTERNS: Partial<Record<TEyeFinish, IEyePatternOption[]>> = {
  EYELINER: EYELINER_PATTERNS,
  KAJAL: KAJAL_PATTERNS,
  EYESHADOW: EYESHADOW_PATTERNS,
  EYEBROW: EYEBROW_PATTERNS,
  MASCARA: MASCARA_PATTERNS,
  LASHES: LASHES_PATTERNS,
};

/* ================= RANGE BOUNDS ================================================================
 * Same shape/role as LIP_RANGE_BOUNDS/FACE_RANGE_BOUNDS - the intensity slider's bounds, one
 * entry per finish. Every EYE finish now has dedicated rendering (see EYE-PLAN.md's build order) -
 * no placeholders left.
 */
export const EYE_RANGE_BOUNDS: Record<TEyeFinish, IRangeBounds> = {
  // Real intensity here is mostly carried by the pattern's own width/blur tuning above (same
  // "don't rely purely on the slider" reasoning BBCREAM_BASE_ALPHA's own comment used) - this
  // range just controls how opaque/dark the liner reads, not its shape.
  EYELINER: { min: 0.3, max: 1, default: 0.7 },
  // Was a much lower {min:0.05,max:0.3,default:0.15} placeholder before KAJAL had any real
  // rendering - EYELINER's own real-photo testing found alpha that low reads as "no product at
  // all" against real lash/skin texture (see EYELINER_PATTERN_TUNING's own comment on the same
  // discovery), so this starts from that same lesson already applied rather than repeating the
  // same round of real-photo tuning to rediscover it.
  KAJAL: { min: 0.3, max: 1, default: 0.7 },
  // A region wash reads differently than a thin stroke at the same alpha (more surface area
  // covers for it even at a lower opacity) - starts from FACE's own eyelid-adjacent finishes'
  // range shape (BLUSH/HIGHLIGHTER-ish) rather than EYELINER/KAJAL's boosted one, revisited if
  // real-photo testing finds this too faint the same way EYELINER's own placeholder was.
  EYESHADOW: { min: 0.15, max: 0.7, default: 0.4 },
  // A brow fill (even "soft powder") needs to read as clearly-defined hair color, not a faint
  // wash - closer to EYELINER/KAJAL's own boosted range than EYESHADOW's softer one.
  EYEBROW: { min: 0.3, max: 0.85, default: 0.55 },
  // Individual lash strokes are thin, same "a thin shape needs boosted alpha to actually read
  // against real texture" lesson EYELINER/KAJAL/EYEBROW's own placeholders all needed real-photo
  // testing to discover - starting from that lesson already applied instead of rediscovering it.
  MASCARA: { min: 0.3, max: 0.85, default: 0.6 },
  // Same "thin individual stroke needs boosted alpha" reasoning as MASCARA - false-lash strands
  // are the same thin shape, just longer/more varied.
  LASHES: { min: 0.3, max: 0.85, default: 0.6 },
  // Deliberately the softest range of any EYE finish - a setting gel reads as a sheer tint over
  // the hairs already there, not a defined color the way EYEBROW's own fill patterns are meant
  // to. Already matched this shape as a placeholder before real rendering existed; kept as-is
  // rather than boosted like EYELINER/EYEBROW's own placeholders needed, since "barely-there" is
  // the actual intended character here, not an artifact of never having been tuned.
  BROWGEL: { min: 0.05, max: 0.3, default: 0.12 },
};

// Category-wide fallback, deliberately NOT any one finish's own default - same reasoning as
// LIP_DEFAULT_RANGE/FACE_DEFAULT_RANGE. Used only for the brief blank-slate moment before a real
// `type` is known (`EyeEngineBase.getInitialState()`).
export const EYE_DEFAULT_RANGE = 0.4;

/* ================= INSTRUCTIONS =================
 * Same role as FACE_UPLOAD_INSTRUCTIONS/FACE_LIVE_INSTRUCTIONS (see that file's own comment) -
 * independent per category rather than a shared base list, since EYE's real constraints
 * (precision-heavy thin lines right up against the lash line) genuinely differ from FACE's
 * full-face-fill concerns.
 */

export const EYE_UPLOAD_INSTRUCTIONS: ITryOnInstruction[] = [
  { icon: 'solar:sun-2-linear', text: 'Good, even lighting - avoid backlight or heavy shadows' },
  { icon: 'solar:radial-blur-linear', text: 'Sharp and in focus, not blurry' },
  {
    icon: 'solar:user-rounded-linear',
    text: 'Eyes fully open and facing the camera directly',
  },
  {
    icon: 'solar:glasses-linear',
    text: 'No glasses, sunglasses, or hair covering your eyes',
  },
];

export const EYE_LIVE_INSTRUCTIONS: ITryOnInstruction[] = [
  { icon: 'solar:sun-2-linear', text: 'Find good, even lighting - avoid strong backlight' },
  { icon: 'solar:user-rounded-linear', text: 'Keep your eyes open, centered and clearly visible' },
  {
    icon: 'solar:videocamera-record-linear',
    text: 'Hold still, facing the camera directly - not turned to the side',
  },
  {
    icon: 'solar:glasses-linear',
    text: 'Remove glasses, sunglasses, or anything covering your eyes',
  },
];

/* ================= SHADES =================
 * See LIP_SHADES's own comment (lip.ts) for why these are hand-curated here rather than pulled
 * from product data.
 */
export const EYE_SHADES: Record<TEyeFinish, IShade[]> = {
  EYEBROW: [
    { name: 'Ash Brown', hexColor: '#6B4A3A' },
    { name: 'Taupe', hexColor: '#8A7968' },
    { name: 'Soft Black', hexColor: '#3A3A3A' },
    { name: 'Dark Brown', hexColor: '#4A2E1F' },
    { name: 'Auburn', hexColor: '#6E3B2A' },
  ],
  EYELINER: [
    { name: 'Classic Black', hexColor: '#1A1A1A' },
    { name: 'Espresso Brown', hexColor: '#3E2723' },
    { name: 'Navy', hexColor: '#1B2A4A' },
    { name: 'Bronze', hexColor: '#6B4423' },
    { name: 'Charcoal', hexColor: '#3B3B3B' },
  ],
  KAJAL: [
    { name: 'Deep Black', hexColor: '#0F0F0F' },
    { name: 'Dark Brown', hexColor: '#3B2415' },
    { name: 'Smoky Grey', hexColor: '#4B4B4B' },
  ],
  EYESHADOW: [
    { name: 'Champagne', hexColor: '#E8D3B0' },
    { name: 'Taupe', hexColor: '#9C8370' },
    { name: 'Bronze', hexColor: '#8C5E2A' },
    { name: 'Plum', hexColor: '#5B3758' },
    { name: 'Rose Gold', hexColor: '#B76E79' },
    { name: 'Smoky Grey', hexColor: '#5C5C5C' },
    { name: 'Olive', hexColor: '#6B6E3A' },
    { name: 'Navy', hexColor: '#233A5E' },
  ],
  MASCARA: [
    { name: 'Jet Black', hexColor: '#121212' },
    { name: 'Brown', hexColor: '#3E2723' },
    { name: 'Blue-Black', hexColor: '#1C2541' },
  ],
  LASHES: [
    { name: 'Natural Black', hexColor: '#1A1A1A' },
    { name: 'Soft Brown', hexColor: '#3E2723' },
  ],
  BROWGEL: [
    { name: 'Clear', hexColor: '#E8DCC8' },
    { name: 'Ash Brown', hexColor: '#6B4A3A' },
    { name: 'Soft Black', hexColor: '#3A3A3A' },
    { name: 'Dark Brown', hexColor: '#4A2E1F' },
    { name: 'Blonde', hexColor: '#C9A46A' },
  ],
};
