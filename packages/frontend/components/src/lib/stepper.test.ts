import { createElement } from 'react';
import { describe, expect, it } from 'vitest';

import { hasContent } from './content.js';
import { getCurrentStep, getStepState } from './stepper.js';

describe('getCurrentStep', () => {
  it('is the step that was asked for when it exists', () => {
    expect(getCurrentStep(0, 4)).toBe(0);
    expect(getCurrentStep(2, 4)).toBe(2);
    expect(getCurrentStep(3, 4)).toBe(3);
  });

  it('puts a number past the ends on the nearest step', () => {
    expect(getCurrentStep(4, 4)).toBe(3);
    expect(getCurrentStep(99, 4)).toBe(3);
    expect(getCurrentStep(-1, 4)).toBe(0);
    expect(getCurrentStep(Number.POSITIVE_INFINITY, 4)).toBe(3);
    expect(getCurrentStep(Number.NEGATIVE_INFINITY, 4)).toBe(0);
  });

  it('puts a number with a fraction on the step it is in', () => {
    expect(getCurrentStep(1.9, 4)).toBe(1);
    expect(getCurrentStep(-0.5, 4)).toBe(0);
  });

  it('is the first step for NaN', () => {
    expect(getCurrentStep(Number.NaN, 4)).toBe(0);
  });

  it('is the first step when there are no steps, never -1', () => {
    expect(getCurrentStep(0, 0)).toBe(0);
    expect(getCurrentStep(5, 0)).toBe(0);
    expect(getCurrentStep(-5, 0)).toBe(0);
  });
});

describe('getStepState', () => {
  it('is completed before the current step, active on it and upcoming after it', () => {
    expect([0, 1, 2, 3].map((index) => getStepState(index, 2))).toEqual([
      'completed',
      'completed',
      'active',
      'upcoming',
    ]);
  });

  it('has nothing completed on the first step', () => {
    expect([0, 1, 2].map((index) => getStepState(index, 0))).toEqual([
      'active',
      'upcoming',
      'upcoming',
    ]);
  });
});

describe('hasContent', () => {
  it('is false for what React shows nothing for', () => {
    for (const nothing of [null, undefined, false, true, '']) {
      expect(hasContent(nothing), String(nothing)).toBe(false);
    }
  });

  it('is true for what React shows, `0` included', () => {
    for (const something of [0, 1, 'text', ' ', createElement('b'), ['a']]) {
      expect(hasContent(something)).toBe(true);
    }
  });
});
