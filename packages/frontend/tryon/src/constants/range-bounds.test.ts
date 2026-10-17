// @vitest-environment node
import { TRY_ON_CATEGORIES, TRY_ON_MAP } from '@beautinique/frontend-constants';
import type { TTryOnCategory, TTryOnSelection } from '@beautinique/frontend-types';
import { describe, expect, it } from 'vitest';

import type { IRangeBounds } from '../types/index.js';
import { EYE_RANGE_BOUNDS } from './eye.js';
import { FACE_RANGE_BOUNDS } from './face.js';
import { HAIR_RANGE_BOUNDS } from './hair.js';
import { LIP_RANGE_BOUNDS } from './lip.js';
import { NAIL_RANGE_BOUNDS } from './nail.js';
import { DEFAULT_RANGE_BOUNDS, getRangeBounds } from './range-bounds.js';

// What each category's bounds are, written out here on its own and not read from the table of the module:
// a category that gets the bounds of another is a mistake the test has to see.
const EXPECTED: Record<TTryOnCategory, Readonly<Record<string, IRangeBounds>>> = {
  LIP: LIP_RANGE_BOUNDS,
  EYE: EYE_RANGE_BOUNDS,
  HAIR: HAIR_RANGE_BOUNDS,
  FACE: FACE_RANGE_BOUNDS,
  NAIL: NAIL_RANGE_BOUNDS,
};

const selection = (category: string, subCategory: string) =>
  ({ category, subCategory }) as unknown as TTryOnSelection;

describe('getRangeBounds', () => {
  describe.each(TRY_ON_CATEGORIES)('%s', (category) => {
    it.each([...TRY_ON_MAP[category]])(
      'gives the bounds that the finish %s has of its own, not those of another category',
      (subCategory) => {
        const own = EXPECTED[category][subCategory];

        expect(own, `${category} ${subCategory} has bounds`).toBeDefined();
        expect(getRangeBounds(selection(category, subCategory))).toBe(own);
        expect(getRangeBounds(selection(category, subCategory))).not.toBe(DEFAULT_RANGE_BOUNDS);
      },
    );
  });

  it('gives sane bounds to every finish of the product: min <= default <= max, and a slider that can move', () => {
    for (const category of TRY_ON_CATEGORIES) {
      for (const subCategory of TRY_ON_MAP[category]) {
        const { min, max, default: value } = getRangeBounds(selection(category, subCategory));

        expect([min, max, value].every(Number.isFinite), `${category} ${subCategory}`).toBe(true);
        expect(min, `${category} ${subCategory}`).toBeLessThanOrEqual(value);
        expect(value, `${category} ${subCategory}`).toBeLessThanOrEqual(max);
        expect(max, `${category} ${subCategory}`).toBeGreaterThan(min);
      }
    }
  });

  describe('with nothing of its own to give', () => {
    it('gives the default while nothing is chosen', () => {
      expect(getRangeBounds(undefined)).toBe(DEFAULT_RANGE_BOUNDS);
      expect(DEFAULT_RANGE_BOUNDS).toEqual({ min: 0, max: 1, default: 0.5 });
    });

    it('gives the default for a finish the category does not have', () => {
      expect(getRangeBounds(selection('LIP', 'NO_SUCH_FINISH'))).toBe(DEFAULT_RANGE_BOUNDS);
    });

    it('gives the default for a finish of another category (the eyeliner is not a lip finish)', () => {
      expect(getRangeBounds(selection('LIP', 'EYELINER'))).toBe(DEFAULT_RANGE_BOUNDS);
    });

    it('gives the default for a category this version does not know (the product can get one before the app has the package for it)', () => {
      expect(getRangeBounds(selection('BODY', 'MATTE'))).toBe(DEFAULT_RANGE_BOUNDS);
    });

    it.each(['constructor', 'toString', '__proto__', 'hasOwnProperty'])(
      'does not hand back something of the prototype of an object for the text %s, as a category or a finish',
      (text) => {
        expect(getRangeBounds(selection(text, 'MATTE'))).toBe(DEFAULT_RANGE_BOUNDS);
        expect(getRangeBounds(selection('LIP', text))).toBe(DEFAULT_RANGE_BOUNDS);
      },
    );
  });

  it('gives the same object every time, so nothing is made per render', () => {
    const lip = selection('LIP', TRY_ON_MAP.LIP[0]);

    expect(getRangeBounds(lip)).toBe(getRangeBounds(lip));
  });
});
