import type { TTryOnCategory, TTryOnSelection } from '@beautinique/frontend-types';

import type { IRangeBounds } from '../types/index.js';
import { EYE_RANGE_BOUNDS } from './eye.js';
import { FACE_RANGE_BOUNDS } from './face.js';
import { HAIR_RANGE_BOUNDS } from './hair.js';
import { LIP_RANGE_BOUNDS } from './lip.js';
import { NAIL_RANGE_BOUNDS } from './nail.js';

/**
 * What the intensity slider gets when there is nothing of its own to give it: no selection yet, or a
 * category or subcategory this version of the package has no bounds for (the product can get a sixth
 * category before an app has the package that knows it).
 */
export const DEFAULT_RANGE_BOUNDS: Readonly<IRangeBounds> = { min: 0, max: 1, default: 0.5 };

// A `Record` over the categories, so a category that is added to the product makes this file fail to
// compile until it has its bounds here, instead of quietly getting the default.
const TABLES: Record<TTryOnCategory, Readonly<Record<string, IRangeBounds>>> = {
  LIP: LIP_RANGE_BOUNDS,
  EYE: EYE_RANGE_BOUNDS,
  HAIR: HAIR_RANGE_BOUNDS,
  FACE: FACE_RANGE_BOUNDS,
  NAIL: NAIL_RANGE_BOUNDS,
};

// Maps, not the plain objects: a lookup by a text that comes from the product (`constructor`, a category
// that is not here) finds nothing, where an object would hand back something of its own prototype.
const RANGE_BOUNDS = new Map<string, ReadonlyMap<string, IRangeBounds>>(
  Object.entries(TABLES).map(([category, bounds]) => [category, new Map(Object.entries(bounds))]),
);

/**
 * The bounds of the intensity slider for what is tried on. Each *finish* tunes its own (FOUNDATION and
 * BLUSH read very differently at the same raw alpha), so it is the subcategory that picks them, not
 * just the category. Always an object: the default when there is nothing of its own.
 */
export const getRangeBounds = (selection: TTryOnSelection | undefined): Readonly<IRangeBounds> =>
  (selection && RANGE_BOUNDS.get(selection.category)?.get(selection.subCategory)) ??
  DEFAULT_RANGE_BOUNDS;
