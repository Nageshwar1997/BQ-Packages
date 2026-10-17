import type { NormalizedLandmark } from '@mediapipe/tasks-vision';
import { describe, expect, it } from 'vitest';

import { CHEEKBONE_LEFT_INDEX, CHEEKBONE_RIGHT_INDEX, NOSE_TIP_INDEX } from '../constants/face.js';
import { isFaceTurnedTooMuch } from './face.js';

// Only `x` is ever read - `y`/`z`/`visibility` are irrelevant to this check, but still required
// by `NormalizedLandmark` itself.
const point = (x: number): NormalizedLandmark => ({ x, y: 0.5, z: 0, visibility: 1 });

// Sparse array with only the three indices `isFaceTurnedTooMuch` actually reads populated -
// mirrors how a real (478-point) landmark array is indexed into, without needing all 478 points.
const makeFace = (noseX: number, leftCheekX: number, rightCheekX: number): NormalizedLandmark[] => {
  const face: NormalizedLandmark[] = [];
  face[NOSE_TIP_INDEX] = point(noseX);
  face[CHEEKBONE_LEFT_INDEX] = point(leftCheekX);
  face[CHEEKBONE_RIGHT_INDEX] = point(rightCheekX);
  return face;
};

describe('isFaceTurnedTooMuch', () => {
  it('reads false for a perfectly frontal, symmetric face', () => {
    expect(isFaceTurnedTooMuch(makeFace(0.5, 0.3, 0.7))).toBe(false);
  });

  it('reads false for a natural, slight turn (still reasonably symmetric)', () => {
    expect(isFaceTurnedTooMuch(makeFace(0.5, 0.35, 0.7))).toBe(false);
  });

  it('reads true for a head turned far enough that one side has collapsed toward the nose', () => {
    expect(isFaceTurnedTooMuch(makeFace(0.5, 0.45, 0.7))).toBe(true);
  });

  it('reads true regardless of which side is the near/collapsed one', () => {
    expect(isFaceTurnedTooMuch(makeFace(0.5, 0.3, 0.55))).toBe(true);
  });

  it('reads false (fails safe) when a required landmark is missing', () => {
    const face: NormalizedLandmark[] = [];
    face[NOSE_TIP_INDEX] = point(0.5);
    // Cheekbone points intentionally left unset.
    expect(isFaceTurnedTooMuch(face)).toBe(false);
  });

  it('reads false exactly at the symmetry threshold (only strictly below it counts as turned)', () => {
    // leftDistance=0.1, rightDistance=0.2 -> symmetry = 0.1/0.2 = 0.5, the threshold itself.
    expect(isFaceTurnedTooMuch(makeFace(0.5, 0.4, 0.7))).toBe(false);
  });
});
