import { describe, expect, it } from 'vitest';

import { getSecondsLeft, isPromiseLike, toSeconds } from './countdown.js';

describe('toSeconds', () => {
  it('keeps a whole number of seconds', () => {
    expect(toSeconds(30)).toBe(30);
    expect(toSeconds(1)).toBe(1);
    expect(toSeconds(0)).toBe(0);
  });

  it('rounds a part of a second up, never down', () => {
    expect(toSeconds(2.2)).toBe(3);
    expect(toSeconds(0.1)).toBe(1);
  });

  it('is no wait for what is not a number of seconds to wait', () => {
    for (const value of [
      -1,
      -0.5,
      -100,
      Number.NaN,
      Number.POSITIVE_INFINITY,
      Number.NEGATIVE_INFINITY,
    ]) {
      expect(toSeconds(value), String(value)).toBe(0);
    }
  });

  it('never gives -0', () => {
    expect(Object.is(toSeconds(-0.2), 0)).toBe(true);
  });
});

describe('getSecondsLeft', () => {
  it('is the whole seconds until the end, counted up', () => {
    expect(getSecondsLeft(10_000, 0)).toBe(10);
    expect(getSecondsLeft(10_000, 1)).toBe(10); // 9.999 s left
    expect(getSecondsLeft(10_000, 999)).toBe(10);
    expect(getSecondsLeft(10_000, 1000)).toBe(9);
    expect(getSecondsLeft(10_000, 9_250)).toBe(1); // 0.75 s left
  });

  it('is 0 only at the end and after it, never negative', () => {
    expect(getSecondsLeft(10_000, 10_000)).toBe(0);
    expect(getSecondsLeft(10_000, 10_001)).toBe(0);
    expect(getSecondsLeft(10_000, 99_999)).toBe(0);
    expect(Object.is(getSecondsLeft(10_000, 99_999), 0)).toBe(true);
  });
});

describe('isPromiseLike', () => {
  it('is true for what can be awaited', () => {
    expect(isPromiseLike(Promise.resolve())).toBe(true);
    expect(isPromiseLike({ then: () => undefined })).toBe(true);
  });

  it('is false for everything else', () => {
    const others: [string, unknown][] = [
      ['undefined', undefined],
      ['null', null],
      ['a number', 0],
      ['the text "then"', 'then'],
      ['true', true],
      ['a function', () => undefined],
      ['an empty object', {}],
      ['an object whose then is not a function', { then: 1 }],
      ['an array', []],
    ];

    for (const [name, value] of others) expect(isPromiseLike(value), name).toBe(false);
  });
});
