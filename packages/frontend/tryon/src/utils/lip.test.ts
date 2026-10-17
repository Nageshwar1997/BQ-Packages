import { TRY_ON_SUB_CATEGORY_MAP } from '@beautinique/frontend-constants';
import { describe, expect, it } from 'vitest';

import { TEXTURED_FINISH_TUNING } from './lip.js';

// The table is `satisfies Partial<Record<TLipFinish, ITexturedFinishTuning>>`: every key is a finish of
// LIP and every entry is complete at compile time - a key of another category or a missing number is a
// type error, not something a runtime test needs to catch. What the type system *can't* catch is a
// value that's the wrong number for what it means - e.g. an opacity typo'd as `3` instead of `0.3`.
// That's what these tests are for.
describe('TEXTURED_FINISH_TUNING', () => {
  const entries = Object.entries(TEXTURED_FINISH_TUNING) as [
    keyof typeof TEXTURED_FINISH_TUNING,
    (typeof TEXTURED_FINISH_TUNING)[keyof typeof TEXTURED_FINISH_TUNING],
  ][];

  it.each(entries)(
    '%s: baseAlphaUpper/Lower is either the -1 sentinel or within [0,1]',
    (_, tuning) => {
      for (const value of [tuning.baseAlphaUpper, tuning.baseAlphaLower]) {
        expect(value === -1 || (value >= 0 && value <= 1)).toBe(true);
      }
    },
  );

  it.each(entries)('%s: every opacity field is within [0,1]', (_, tuning) => {
    for (const value of [
      tuning.brightOpacity,
      tuning.darkPrimaryOpacity,
      tuning.darkInsetOpacityUpper,
      tuning.darkInsetOpacityLower,
    ]) {
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(1);
    }
  });

  it.each(entries)('%s: applyFilters is a boolean', (_, tuning) => {
    expect(typeof tuning.applyFilters).toBe('boolean');
  });

  it('CRAYON is the only finish using the -1 "use the caller\'s alpha" sentinel', () => {
    const sentinelFinishes = entries
      .filter(([, tuning]) => tuning.baseAlphaUpper === -1 || tuning.baseAlphaLower === -1)
      .map(([finish]) => finish);
    expect(sentinelFinishes).toEqual([TRY_ON_SUB_CATEGORY_MAP.CRAYON]);
  });
});
