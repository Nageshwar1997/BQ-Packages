import { describe, expect, it } from 'vitest';

import { LIP_OUTER_CONTOUR_INDICES, LOWER_LIP_INDICES, UPPER_LIP_INDICES } from './lip.js';

describe('LIP_OUTER_CONTOUR_INDICES', () => {
  // Hardcoded, not re-derived with the same slice/reverse formula the source uses - a
  // recomputed comparison would trivially match even if `UPPER_LIP_INDICES`/`LOWER_LIP_INDICES`
  // themselves changed underneath it. This anchors the actual numbers, so an accidental edit to
  // either source array shows up here as a real diff instead of silently propagating through.
  it('matches the known-good outer contour derived from the vetted lip index arrays', () => {
    expect(LIP_OUTER_CONTOUR_INDICES).toEqual([
      61, 185, 40, 39, 37, 0, 267, 269, 270, 409, 291, 375, 321, 405, 314, 17, 84, 181, 91, 146, 61,
    ]);
  });

  it('has 21 points (11-point upper arc + 10-point lower arc)', () => {
    expect(LIP_OUTER_CONTOUR_INDICES).toHaveLength(21);
  });

  it('starts and ends on the same landmark - a closed loop back to the left mouth corner', () => {
    expect(LIP_OUTER_CONTOUR_INDICES[0]).toBe(LIP_OUTER_CONTOUR_INDICES.at(-1));
    expect(LIP_OUTER_CONTOUR_INDICES[0]).toBe(UPPER_LIP_INDICES[0]);
  });

  it('has no duplicate indices other than the intentional start/end closure', () => {
    const withoutClosingPoint = LIP_OUTER_CONTOUR_INDICES.slice(0, -1);
    expect(new Set(withoutClosingPoint).size).toBe(withoutClosingPoint.length);
  });

  it('the 11th point (index 10) is the shared right mouth corner both arcs meet at', () => {
    expect(LIP_OUTER_CONTOUR_INDICES[10]).toBe(UPPER_LIP_INDICES[10]);
    expect(LIP_OUTER_CONTOUR_INDICES[10]).toBe(LOWER_LIP_INDICES[10]);
  });
});
