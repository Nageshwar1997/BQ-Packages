import { describe, expect, it } from 'vitest';

import { findEnabledIndex, findTypeaheadMatch } from './typeahead.js';

const FRUITS = [
  { label: 'Apple' },
  { label: 'Apricot' },
  { label: 'Banana' },
  { label: 'Blueberry', disabled: true },
  { label: 'Cherry' },
  { label: 'banana split' },
];

describe('findTypeaheadMatch', () => {
  it('finds the first option that starts with what was typed, from the current one', () => {
    expect(findTypeaheadMatch(FRUITS, 'b', 0)).toBe(2);
    expect(findTypeaheadMatch(FRUITS, 'ch', 0)).toBe(4);
  });

  it('does not care about the case, on either side', () => {
    expect(findTypeaheadMatch(FRUITS, 'BAN', 0)).toBe(2);
    expect(findTypeaheadMatch(FRUITS, 'a', 5)).toBe(0);
  });

  it('looks from the current option on, and starts over at the top', () => {
    expect(findTypeaheadMatch(FRUITS, 'a', 1)).toBe(1); // it is still a match: it stays
    expect(findTypeaheadMatch(FRUITS, 'ap', 2)).toBe(0); // wraps to the top
  });

  it('stays on the current option while it still matches what is typed', () => {
    expect(findTypeaheadMatch(FRUITS, 'ba', 5)).toBe(5);
  });

  it('goes through the options of one letter when it is pressed again', () => {
    expect(findTypeaheadMatch(FRUITS, 'aa', 0)).toBe(1); // the next one that starts with a
    expect(findTypeaheadMatch(FRUITS, 'aaa', 1)).toBe(0); // and round again
  });

  it('skips the options that cannot be chosen', () => {
    expect(findTypeaheadMatch(FRUITS, 'blue', 0)).toBe(-1);
  });

  it('is -1 when nothing matches, when nothing was typed, and when there are no options', () => {
    expect(findTypeaheadMatch(FRUITS, 'z', 0)).toBe(-1);
    expect(findTypeaheadMatch(FRUITS, '', 0)).toBe(-1);
    expect(findTypeaheadMatch([], 'a', 0)).toBe(-1);
  });

  it('starts from -1 (nothing chosen yet) and from past the end', () => {
    expect(findTypeaheadMatch(FRUITS, 'c', -1)).toBe(4);
    expect(findTypeaheadMatch(FRUITS, 'a', 99)).toBe(0);
  });
});

describe('findEnabledIndex', () => {
  const OPTIONS = [{}, { disabled: true }, {}, { disabled: true }, { disabled: true }, {}];

  it('is the next option that can be chosen, in either direction', () => {
    expect(findEnabledIndex(OPTIONS, 0, 1)).toBe(2);
    expect(findEnabledIndex(OPTIONS, 2, 1)).toBe(5);
    expect(findEnabledIndex(OPTIONS, 5, -1)).toBe(2);
    expect(findEnabledIndex(OPTIONS, 2, -1)).toBe(0);
  });

  it('is -1 at the end of the list', () => {
    expect(findEnabledIndex(OPTIONS, 5, 1)).toBe(-1);
    expect(findEnabledIndex(OPTIONS, 0, -1)).toBe(-1);
  });

  it('finds the first and the last from outside the list', () => {
    expect(findEnabledIndex(OPTIONS, -1, 1)).toBe(0);
    expect(findEnabledIndex(OPTIONS, OPTIONS.length, -1)).toBe(5);
  });

  it('is -1 when no option can be chosen', () => {
    expect(findEnabledIndex([{ disabled: true }, { disabled: true }], -1, 1)).toBe(-1);
    expect(findEnabledIndex([], -1, 1)).toBe(-1);
  });
});
