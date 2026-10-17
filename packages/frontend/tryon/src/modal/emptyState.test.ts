// @vitest-environment node
import { TRY_ON_CATEGORIES, TRY_ON_MAP } from '@beautinique/frontend-constants';
import type { TTryOnSelection } from '@beautinique/frontend-types';
import { describe, expect, it } from 'vitest';

import { getEmptyStateCopy, hasStage } from './emptyState.js';

const selection = (category: string, subCategory: string) =>
  ({ category, subCategory }) as unknown as TTryOnSelection;

describe('hasStage', () => {
  it.each(['LIP', 'FACE', 'EYE', 'HAIR', 'NAIL'])('is true for a selection of %s', (category) => {
    expect(hasStage(selection(category, 'ANY'))).toBe(true);
  });

  it('is true for every category of the product: this version has a stage for each of them', () => {
    // If the product gets a sixth category this fails on purpose, until its stage is written
    for (const category of TRY_ON_CATEGORIES) {
      expect(hasStage({ category, subCategory: TRY_ON_MAP[category][0] } as TTryOnSelection)).toBe(
        true,
      );
    }
  });

  it('is false when there is nothing chosen', () => {
    expect(hasStage(undefined)).toBe(false);
  });

  it.each(['BODY', 'constructor', '__proto__', 'toString', ''])(
    'is false for a category that is not one of the five (%j)',
    (category) => {
      expect(hasStage(selection(category, 'MATTE'))).toBe(false);
    },
  );
});

describe('getEmptyStateCopy', () => {
  it('asks for a choice in the modal that can be set up, while nothing is chosen', () => {
    expect(getEmptyStateCopy(undefined, true)).toEqual({
      title: 'Choose what to try on',
      description: 'Choose a category and a subcategory above to start.',
    });
  });

  it('tells a shopper that the product has no try-on, while there is no selection', () => {
    expect(getEmptyStateCopy(undefined, false)).toEqual({
      title: 'Try-On not available',
      description: 'This product has no Try-On configured yet.',
    });
  });

  it.each([true, false])(
    'says "coming soon", with the category, for a selection that has no stage (selectable: %s)',
    (selectable) => {
      expect(getEmptyStateCopy(selection('BODY', 'TATTOO'), selectable)).toEqual({
        title: 'Coming soon',
        description: 'Try-on for BODY is coming soon.',
      });
    },
  );

  it('gives the same object for the same case, so nothing is made per render', () => {
    expect(getEmptyStateCopy(undefined, true)).toBe(getEmptyStateCopy(undefined, true));
    expect(getEmptyStateCopy(undefined, false)).toBe(getEmptyStateCopy(undefined, false));
  });
});
