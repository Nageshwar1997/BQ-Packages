import type { THairFinish } from '../types/hair.js';
import type { IRangeBounds, IShade, ITryOnInstruction } from '../types/index.js';

// Same shape/role as `FACE_RANGE_BOUNDS`/`LIP_RANGE_BOUNDS` - the intensity slider's bounds, one
// entry per finish.
export const HAIR_RANGE_BOUNDS: Record<THairFinish, IRangeBounds> = {
  // No reference equivalent (no reference implementation covers hair recolor at all - see
  // docs/tryons/HAIR-PLAN.md's Research section) - own judgment call. The `'color'` blend
  // composite (`applyColorHair`, utils/tryon-utils/hair.ts) already reads as a full recolor even
  // at a modest alpha (unlike a flat wash, it's not fighting the frame's own luminance for
  // visibility), so this doesn't need FOUNDATION's wide 0.1-0.8 range to read clearly - expected
  // to get real-device tuned once rendering, same as every other range in this app.
  COLOR: { min: 0.3, max: 1, default: 0.7 },
  // Same bounds as COLOR for now - `applyHighlightsHair` only recolors a handful of narrow streak
  // columns (`buildStreakColumnIntensity`, utils/tryon-utils/hair.ts), so at the same raw alpha it
  // reads as much less color overall than COLOR's full-strand wash. Kept identical rather than
  // compensating with a higher default here, same "let real-device testing tune it, don't guess
  // twice" reasoning OMBRE's own entry below already uses.
  HIGHLIGHTS: { min: 0.3, max: 1, default: 0.7 },
  // Same bounds as COLOR, deliberately - `applyHennaHair` is `applyColorHair` itself (see that
  // function's own comment, utils/tryon-utils/hair.ts), so there's no separate rendering behavior
  // here that would call for different bounds.
  HENNA: { min: 0.3, max: 1, default: 0.7 },
  // Same bounds as COLOR for now - `applyOmbreHair` only recolors from the mask's own detected
  // root down to the tip (never the roots themselves), so at the same raw alpha it reads as less
  // color overall than COLOR's full-strand wash. Kept identical to COLOR rather than compensating
  // with a higher default here, since that's exactly the kind of judgment call this app's own
  // convention (`FACE_RANGE_BOUNDS`'s per-finish comments) expects to get real-device tuned once
  // rendering, not guessed twice.
  OMBRE: { min: 0.3, max: 1, default: 0.7 },
};

// Category-wide fallback, deliberately NOT any one finish's own default above - same reasoning as
// `FACE_DEFAULT_RANGE`/`LIP_DEFAULT_RANGE`. Used only for the brief blank-slate moment before a
// real `type` is known (`HairEngineBase.getInitialState()`).
export const HAIR_DEFAULT_RANGE = 0.7;

/* ================= INSTRUCTIONS =================
 * Shown before a shopper picks/takes a photo - see `getTryOnInstructions` in `./index` for why
 * these are independent per category. HAIR's own real constraint: the segmentation model reads
 * hair from the photo/frame's own pixels (no landmark ring to fall back on), so anything that
 * obscures or disguises where the hair actually is - a hat, a hood, hair tucked out of frame -
 * genuinely breaks detection in a way FACE/LIP/EYE's landmark tracking doesn't have to worry about.
 */

export const HAIR_UPLOAD_INSTRUCTIONS: ITryOnInstruction[] = [
  { icon: 'solar:sun-2-linear', text: 'Good, even lighting - avoid backlight or heavy shadows' },
  { icon: 'solar:radial-blur-linear', text: 'Sharp and in focus, not blurry' },
  {
    icon: 'solar:user-rounded-linear',
    text: 'Hair fully visible - not tucked under a collar or cut off by the frame',
  },
  {
    icon: 'solar:square-academic-cap-linear',
    text: 'No hat, hood, or scarf covering your hair',
  },
];

export const HAIR_LIVE_INSTRUCTIONS: ITryOnInstruction[] = [
  { icon: 'solar:sun-2-linear', text: 'Find good, even lighting - avoid strong backlight' },
  { icon: 'solar:user-rounded-linear', text: 'Keep your hair fully visible in frame' },
  {
    icon: 'solar:videocamera-record-linear',
    text: 'Hold still for a moment so the camera can find your hair clearly',
  },
  {
    icon: 'solar:square-academic-cap-linear',
    text: 'Remove any hat, hood, or scarf covering your hair',
  },
];

/* ================= SHADES =================
 * See LIP_SHADES's own comment (lip.ts) for why these are hand-curated here rather than pulled
 * from product data. OMBRE's shades represent the gradient's tip color, since `applyOmbreHair`
 * blends from the root toward whichever single color is picked here (see utils/tryon-utils/hair.ts).
 */
export const HAIR_SHADES: Record<THairFinish, IShade[]> = {
  COLOR: [
    { name: 'Jet Black', hexColor: '#0B0B0B' },
    { name: 'Dark Brown', hexColor: '#3B2415' },
    { name: 'Chestnut', hexColor: '#5C3317' },
    { name: 'Chocolate Brown', hexColor: '#4A2C1A' },
    { name: 'Burgundy', hexColor: '#5C1A2E' },
    { name: 'Auburn', hexColor: '#7A3B2E' },
    { name: 'Honey Blonde', hexColor: '#C68E52' },
    { name: 'Ash Blonde', hexColor: '#BBA27A' },
  ],
  HIGHLIGHTS: [
    { name: 'Golden Blonde', hexColor: '#D4A64A' },
    { name: 'Caramel', hexColor: '#A9703D' },
    { name: 'Platinum', hexColor: '#E8E3D8' },
    { name: 'Copper', hexColor: '#B5651D' },
    { name: 'Ash Brown', hexColor: '#6B5A4A' },
  ],
  HENNA: [
    { name: 'Natural Henna', hexColor: '#8B3A1E' },
    { name: 'Burgundy Henna', hexColor: '#6B1F2E' },
    { name: 'Dark Brown Henna', hexColor: '#4A2E1F' },
    { name: 'Mahogany', hexColor: '#4E1609' },
  ],
  OMBRE: [
    { name: 'Black to Brown', hexColor: '#4A2E1F' },
    { name: 'Brown to Blonde', hexColor: '#A9703D' },
    { name: 'Black to Burgundy', hexColor: '#5C1A2E' },
    { name: 'Brown to Caramel', hexColor: '#8C5A2E' },
  ],
};
