import { describe, expect, it } from 'vitest';

import { MOUTH_OUTER_CONTOUR_INDICES } from './face.js';

// Same reasoning as constants/tryon-constants/lip.test.ts's identical suite, against FACE's own
// mouth-exclusion ring - `MOUTH_OUTER_CONTOUR_INDICES` is genuinely *derived* at module-load time
// (see its own comment, ./face.ts) from `MOUTH_UPPER_OUTER_ARC`/`MOUTH_LOWER_OUTER_ARC` via the
// exact same "outer arc forward, then the other reversed" formula LIP's own
// `LIP_OUTER_CONTOUR_INDICES` uses - not hand-transcribed, so nothing here re-derives it with that
// same formula (a recomputed comparison would trivially match even if the source arcs changed
// underneath it). This anchors the actual numbers instead, so an accidental edit to either source
// arc - or to the derivation itself - shows up as a real diff.
//
// `MOUTH_UPPER_OUTER_ARC`/`MOUTH_LOWER_OUTER_ARC` themselves stay unexported (only
// `MOUTH_OUTER_CONTOUR_INDICES` is public - nothing else needs the two raw arcs) - the corner
// landmarks (61 = left mouth corner, 291 = right) are hardcoded below rather than importing them,
// same stable, publicly-documented MediaPipe ids LIP's own arrays are built from (LIP's
// `UPPER_LIP_INDICES`/`LOWER_LIP_INDICES` start/end on the exact same two ids).
describe('MOUTH_OUTER_CONTOUR_INDICES', () => {
  it('matches the known-good outer mouth contour derived from the vetted arc arrays', () => {
    expect(MOUTH_OUTER_CONTOUR_INDICES).toEqual([
      61, 185, 40, 39, 37, 0, 267, 269, 270, 409, 291, 375, 321, 405, 314, 17, 84, 181, 91, 146, 61,
    ]);
  });

  it('has 21 points (11-point upper arc + 10-point lower arc)', () => {
    expect(MOUTH_OUTER_CONTOUR_INDICES).toHaveLength(21);
  });

  it('starts and ends on the same landmark - a closed loop back to the left mouth corner', () => {
    expect(MOUTH_OUTER_CONTOUR_INDICES[0]).toBe(MOUTH_OUTER_CONTOUR_INDICES.at(-1));
    expect(MOUTH_OUTER_CONTOUR_INDICES[0]).toBe(61);
  });

  it('has no duplicate indices other than the intentional start/end closure', () => {
    const withoutClosingPoint = MOUTH_OUTER_CONTOUR_INDICES.slice(0, -1);
    expect(new Set(withoutClosingPoint).size).toBe(withoutClosingPoint.length);
  });

  it('the 11th point (index 10) is the shared right mouth corner both arcs meet at', () => {
    expect(MOUTH_OUTER_CONTOUR_INDICES[10]).toBe(291);
  });
});
