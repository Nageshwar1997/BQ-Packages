import { describe, expect, it } from 'vitest';

import type { IHairMask } from '../types/hair.js';
import { getHairDetectionStatus } from './hair.js';

// Same convention as face.test.ts/eye.test.ts - `getHairDetectionStatus` is plain Float32Array
// math, no canvas/2D-context involved, so this runs in the default Node environment (no
// `@vitest-environment jsdom`, no `canvas` package) unlike hair.smoke.test.ts's own render tests.

const MASK_SIZE = 64;

// Same fixture as hair.smoke.test.ts's own `makeFixtureMask` (duplicated here per this app's own
// self-contained-per-test-file convention, same reasoning lip.ts/eye.ts's constants files already
// document for cross-file duplication) - a radial confidence falloff with a solid, well-above-
// threshold center.
const makeFixtureMask = (): IHairMask => {
  const data = new Float32Array(MASK_SIZE * MASK_SIZE);
  const center = (MASK_SIZE - 1) / 2;
  const maxRadius = Math.SQRT2 * center;

  for (let y = 0; y < MASK_SIZE; y++) {
    for (let x = 0; x < MASK_SIZE; x++) {
      const distance = Math.hypot(x - center, y - center);
      data[y * MASK_SIZE + x] = Math.max(0, 1 - distance / maxRadius);
    }
  }

  return { data, width: MASK_SIZE, height: MASK_SIZE };
};

describe('getHairDetectionStatus', () => {
  it('returns "not-in-frame" for a null mask', () => {
    expect(getHairDetectionStatus(null)).toBe('not-in-frame');
  });

  it('returns "not-in-frame" for a mask with no confident hair pixels', () => {
    const mask: IHairMask = { data: new Float32Array(100), width: 10, height: 10 };
    expect(getHairDetectionStatus(mask)).toBe('not-in-frame');
  });

  it('returns "detected" for a mask with enough confident hair pixels', () => {
    expect(getHairDetectionStatus(makeFixtureMask())).toBe('detected');
  });
});
