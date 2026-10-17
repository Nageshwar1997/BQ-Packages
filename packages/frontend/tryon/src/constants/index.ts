import { TRY_ON_CATEGORY_MAP } from '@beautinique/frontend-constants';
import type { TTryOnCategory } from '@beautinique/frontend-types';

import type { IShade, ITryOnInstruction, TTryOnMode } from '../types/index.js';
import { EYE_LIVE_INSTRUCTIONS, EYE_SHADES, EYE_UPLOAD_INSTRUCTIONS } from './eye.js';
import { FACE_LIVE_INSTRUCTIONS, FACE_SHADES, FACE_UPLOAD_INSTRUCTIONS } from './face.js';
import { HAIR_LIVE_INSTRUCTIONS, HAIR_SHADES, HAIR_UPLOAD_INSTRUCTIONS } from './hair.js';
import { LIP_LIVE_INSTRUCTIONS, LIP_SHADES, LIP_UPLOAD_INSTRUCTIONS } from './lip.js';
import { NAIL_LIVE_INSTRUCTIONS, NAIL_SHADES, NAIL_UPLOAD_INSTRUCTIONS } from './nail.js';

export * from './assets.js';

// Category-agnostic Try-On constants - shared by every category's modal, not just LIP (compare
// to `./lip.ts`, which is LIP-specific rendering data - every other category has its own
// same-shaped file alongside it in this folder).

// Preset stock-model photos a shopper can try a shade on without their own camera/photo - one set
// per tracking target, not per category, since LIP/FACE/EYE all track the same face mesh and can
// share the face set, while HAIR (pixel segmentation) and NAIL (hand landmarks) genuinely need
// their own photos - a face-only photo has no hand in it for NAIL to detect, and vice versa.
// `TryOnModelList.tsx` picks between these three by `category` via a switch. Same 6-region Indian
// diversity across all three sets, same filenames, just a different subfolder. These are paths
// inside the assets package (`@beautinique/frontend-tryon-assets`): `resolveTryOnAssetUrl` makes
// the address of one from the `assets` option of the modal.
export const TRYON_MODEL_IMAGES_FACE = [
  'images/models/face/North-Indian.webp',
  'images/models/face/East-Indian.webp',
  'images/models/face/West-Indian.webp',
  'images/models/face/Northeast-Indian.webp',
  'images/models/face/Central-Indian.webp',
  'images/models/face/South-Indian.webp',
];

export const TRYON_MODEL_IMAGES_HAIR = [
  'images/models/hair/North-Indian.webp',
  'images/models/hair/East-Indian.webp',
  'images/models/hair/West-Indian.webp',
  'images/models/hair/Northeast-Indian.webp',
  'images/models/hair/Central-Indian.webp',
  'images/models/hair/South-Indian.webp',
];

export const TRYON_MODEL_IMAGES_HAND = [
  'images/models/hand/North-Indian.webp',
  'images/models/hand/East-Indian.webp',
  'images/models/hand/West-Indian.webp',
  'images/models/hand/Northeast-Indian.webp',
  'images/models/hand/Central-Indian.webp',
  'images/models/hand/South-Indian.webp',
];

export const TRYON_MODES = ['LIVE', 'UPLOAD'] as const;

export const TRYON_MODE_MAP = Object.fromEntries(
  TRYON_MODES.map((role) => [role, role] as const),
) as {
  [K in (typeof TRYON_MODES)[number]]: K;
};

/* ================= PER-CATEGORY INSTRUCTIONS ==================================================
 * Shown before a shopper picks/takes a photo - in the sidebar's compact popover and the full
 * instructions screen - so they know what makes a tryon actually work well, before finding out
 * after a bad shot/frame gives a bad result.
 *
 * Deliberately one full, independent list per category (defined in that category's own file -
 * `./lip.ts`'s `LIP_UPLOAD_INSTRUCTIONS`/`LIP_LIVE_INSTRUCTIONS`, `./face.ts`'s equivalents)
 * rather than a shared base list every category extends: each category's own tryon pipeline has
 * its own real constraints, and those don't generalize. FACE's full-face fill genuinely breaks
 * on a turned head or hair falling across the forehead in a way LIP's lip-only region never has
 * to care about; a future NAIL flow wouldn't need "face" advice at all. A shared base would
 * either miss a category's actual gotchas or hand every other category advice that doesn't apply
 * to it. Independent lists do mean the handful of genuinely universal tips (lighting, focus) get
 * repeated per category - a fine trade for each list staying accurate and independently
 * editable, matching how this app already keeps everything else category-specific in its own
 * place (separate engine classes, separate landmark-constants files, etc. per category).
 *
 * This file only wires those category-owned lists together into one lookup - it doesn't define
 * any instruction text itself.
 */

// Central registry - one entry per category that has a real tryon flow built (see `TRY_ON_MAP`
// in `@beautinique/frontend-types` for the full, eventual category list; LIP/FACE/EYE/HAIR/NAIL
// exist so far). `Partial` on purpose: a category without its own tryon flow yet has nothing real
// to give tips about - `getTryOnInstructions` falls back to an empty list rather than guessing.
const TRY_ON_INSTRUCTIONS: Partial<
  Record<TTryOnCategory, Record<TTryOnMode, ITryOnInstruction[]>>
> = {
  LIP: { UPLOAD: LIP_UPLOAD_INSTRUCTIONS, LIVE: LIP_LIVE_INSTRUCTIONS },
  FACE: { UPLOAD: FACE_UPLOAD_INSTRUCTIONS, LIVE: FACE_LIVE_INSTRUCTIONS },
  EYE: { UPLOAD: EYE_UPLOAD_INSTRUCTIONS, LIVE: EYE_LIVE_INSTRUCTIONS },
  HAIR: { UPLOAD: HAIR_UPLOAD_INSTRUCTIONS, LIVE: HAIR_LIVE_INSTRUCTIONS },
  NAIL: { UPLOAD: NAIL_UPLOAD_INSTRUCTIONS, LIVE: NAIL_LIVE_INSTRUCTIONS },
};

export const getTryOnInstructions = (
  category: TTryOnCategory,
  mode: TTryOnMode,
): ITryOnInstruction[] => TRY_ON_INSTRUCTIONS[category]?.[mode] ?? [];

export const TRYON_MODE_OPTIONS = [
  {
    icon: 'solar:camera-linear',
    mode: TRYON_MODE_MAP.LIVE,
    title: 'Try it Live',
    description: 'Use your camera for a real-time Try-On',
  },
  {
    icon: 'solar:gallery-send-linear',
    mode: TRYON_MODE_MAP.UPLOAD,
    title: 'Upload Photo',
    description: 'Upload a photo for a static Try-On',
  },
] as const;

/* ================= CATEGORY BROWSER (standalone `/tryons` page) ===============================
 * Display metadata for `src/pages/tryons` - the entry point where a shopper picks a
 * category + subCategory directly (not from a product page) to launch the same `TryOnModal`.
 * One entry per category with a real tryon flow built, same scope as `TRY_ON_INSTRUCTIONS` above.
 */
export const TRYON_CATEGORY_OPTIONS: {
  category: TTryOnCategory;
  icon: string;
  title: string;
  description: string;
}[] = [
  {
    category: TRY_ON_CATEGORY_MAP.LIP,
    icon: 'mdi:lipstick',
    title: 'Lips',
    description: 'Lipstick, gloss, liner and more',
  },
  {
    category: TRY_ON_CATEGORY_MAP.EYE,
    icon: 'solar:eye-linear',
    title: 'Eyes',
    description: 'Eyeliner, kajal, eyeshadow and more',
  },
  {
    category: TRY_ON_CATEGORY_MAP.HAIR,
    icon: 'icon-park-outline:comb',
    title: 'Hair',
    description: 'Color, highlights, henna and ombre',
  },
  {
    category: TRY_ON_CATEGORY_MAP.FACE,
    icon: 'icon-park-outline:foundation-makeup',
    title: 'Face',
    description: 'Foundation, concealer, blush and more',
  },
  {
    category: TRY_ON_CATEGORY_MAP.NAIL,
    icon: 'icon-park-outline:nail-polish',
    title: 'Nails',
    description: 'Gel, chrome, glitter and more',
  },
];

// Per-category shade registries, keyed by that category's own finish type (see each file's own
// `X_SHADES` for the curated list) - not typed as one strict mapped type here since the lookup
// below is keyed dynamically by whatever `TryOnModelList.tsx`'s `category`/`subCategory` pair is
// at runtime, not a statically-known literal pairing.
const TRYON_SHADES: Record<TTryOnCategory, Record<string, IShade[]>> = {
  LIP: LIP_SHADES,
  EYE: EYE_SHADES,
  HAIR: HAIR_SHADES,
  FACE: FACE_SHADES,
  NAIL: NAIL_SHADES,
};

// Looks up the curated shade list for a given category + subCategory (see `TRYON_CATEGORY_OPTIONS`
// above) - used by `src/pages/tryons` to pass `TryOnModal` a `shades` list matching whichever
// subcategory the shopper picked.
export const getTryOnShades = (category: TTryOnCategory, subCategory: string): IShade[] =>
  TRYON_SHADES[category][subCategory] ?? [];
