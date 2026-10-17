import type { NormalizedLandmark } from '@mediapipe/tasks-vision';
import { describe, expect, it } from 'vitest';

import type { ILashStrokeTuning } from '../constants/eye.js';
import { CHEEKBONE_LEFT_INDEX, CHEEKBONE_RIGHT_INDEX, NOSE_TIP_INDEX } from '../constants/eye.js';
import {
  buildHairStrokeEdges,
  isEyeTurnedTooMuch,
  lashLengthShapeMultiplier,
  rotateTowardUp,
} from './eye.js';

// Same reasoning as face.test.ts's identical helper/fixture - only `x` matters here, and a sparse
// array with just the three indices this check actually reads is enough, no need for a full
// 478-point face.
const point = (x: number): NormalizedLandmark => ({ x, y: 0.5, z: 0, visibility: 1 });

const makeFace = (noseX: number, leftCheekX: number, rightCheekX: number): NormalizedLandmark[] => {
  const face: NormalizedLandmark[] = [];
  face[NOSE_TIP_INDEX] = point(noseX);
  face[CHEEKBONE_LEFT_INDEX] = point(leftCheekX);
  face[CHEEKBONE_RIGHT_INDEX] = point(rightCheekX);
  return face;
};

// Mirrors face.test.ts's own `isFaceTurnedTooMuch` suite - `isEyeTurnedTooMuch` is a duplicate of
// that exact same check (same constants, same threshold), against EYE's own cheekbone indices, so
// this confirms EYE's copy behaves identically rather than just assuming it does because the
// source looks the same.
describe('isEyeTurnedTooMuch', () => {
  it('reads false for a perfectly frontal, symmetric face', () => {
    expect(isEyeTurnedTooMuch(makeFace(0.5, 0.3, 0.7))).toBe(false);
  });

  it('reads false for a natural, slight turn (still reasonably symmetric)', () => {
    expect(isEyeTurnedTooMuch(makeFace(0.5, 0.35, 0.7))).toBe(false);
  });

  it('reads true for a head turned far enough that one side has collapsed toward the nose', () => {
    expect(isEyeTurnedTooMuch(makeFace(0.5, 0.45, 0.7))).toBe(true);
  });

  it('reads true regardless of which side is the near/collapsed one', () => {
    expect(isEyeTurnedTooMuch(makeFace(0.5, 0.3, 0.55))).toBe(true);
  });

  it('reads false (fails safe) when a required landmark is missing', () => {
    const face: NormalizedLandmark[] = [];
    face[NOSE_TIP_INDEX] = point(0.5);
    // Cheekbone points intentionally left unset.
    expect(isEyeTurnedTooMuch(face)).toBe(false);
  });

  it('reads false exactly at the symmetry threshold (only strictly below it counts as turned)', () => {
    // leftDistance=0.1, rightDistance=0.2 -> symmetry = 0.1/0.2 = 0.5, the threshold itself.
    expect(isEyeTurnedTooMuch(makeFace(0.5, 0.4, 0.7))).toBe(false);
  });
});

// MASCARA's own historical claim ("curl pulls every lash toward straight-up regardless of its own
// root direction") was, until now, only ever confirmed by eyeballing a render - this is that claim
// as a direct, deterministic test of the actual math (`buildLashPoints` calls this once per
// segment), not an inference from rendered pixels.
describe('rotateTowardUp', () => {
  const UP = -Math.PI / 2;

  it('leaves the angle unchanged at fraction 0 (no curl)', () => {
    expect(rotateTowardUp(0, 0)).toBeCloseTo(0);
    expect(rotateTowardUp(Math.PI / 4, 0)).toBeCloseTo(Math.PI / 4);
  });

  it('lands exactly on straight-up at fraction 1 (full curl), regardless of starting angle', () => {
    expect(rotateTowardUp(0, 1)).toBeCloseTo(UP);
    expect(rotateTowardUp(Math.PI / 3, 1)).toBeCloseTo(UP);
    expect(rotateTowardUp(-Math.PI, 1)).toBeCloseTo(UP);
  });

  it('interpolates linearly - halfway there at fraction 0.5', () => {
    const start = 0;
    expect(rotateTowardUp(start, 0.5)).toBeCloseTo((start + UP) / 2);
  });
});

// LASHES' own historical claim ("Winged grows monotonically toward the outer corner, Doll-eye
// peaks at the center") - same reasoning as `rotateTowardUp` above, a direct test of
// `lashLengthShapeMultiplier`'s actual math instead of an inference from rendered pixels.
describe('lashLengthShapeMultiplier', () => {
  const baseTuning: ILashStrokeTuning = {
    strokeCount: 10,
    strokeWidthRatio: 0.02,
    strokeLengthRatio: 0.1,
    curlFraction: 0.2,
  };

  it('is a no-op (always 1) when lengthShape is unset - every MASCARA pattern and LASHES own Natural/Wispy/Dramatic leave it unset', () => {
    expect(lashLengthShapeMultiplier(baseTuning, 0)).toBe(1);
    expect(lashLengthShapeMultiplier(baseTuning, 0.5)).toBe(1);
    expect(lashLengthShapeMultiplier(baseTuning, 1)).toBe(1);
  });

  it("'ramp-outer' (Winged) grows monotonically from 1 at the inner corner to 1+amount at the outer", () => {
    const tuning: ILashStrokeTuning = {
      ...baseTuning,
      lengthShape: { kind: 'ramp-outer', amount: 0.9 },
    };
    expect(lashLengthShapeMultiplier(tuning, 0)).toBeCloseTo(1);
    expect(lashLengthShapeMultiplier(tuning, 0.5)).toBeCloseTo(1.45);
    expect(lashLengthShapeMultiplier(tuning, 1)).toBeCloseTo(1.9);
  });

  it("'peak-center' (Doll-eye) is 1 at both corners and peaks at 1+amount in the middle", () => {
    const tuning: ILashStrokeTuning = {
      ...baseTuning,
      lengthShape: { kind: 'peak-center', amount: 0.6 },
    };
    expect(lashLengthShapeMultiplier(tuning, 0)).toBeCloseTo(1);
    expect(lashLengthShapeMultiplier(tuning, 1)).toBeCloseTo(1);
    expect(lashLengthShapeMultiplier(tuning, 0.5)).toBeCloseTo(1.6);
    // Genuinely a peak, not just "bigger in the middle" - the ends must be strictly smaller.
    expect(lashLengthShapeMultiplier(tuning, 0.5)).toBeGreaterThan(
      lashLengthShapeMultiplier(tuning, 0.1),
    );
    expect(lashLengthShapeMultiplier(tuning, 0.5)).toBeGreaterThan(
      lashLengthShapeMultiplier(tuning, 0.9),
    );
  });
});

// EYEBROW's own historical claim ("edgeA[i] and edgeB[i] are the same position along the brow's
// length") was, until now, only ever confirmed by eyeballing a render on one brow shape - this is
// that claim tested directly against several different brow-ring shapes (straight, arched, and a
// point count that doesn't split evenly), not inferred from rendered pixels.
describe('buildHairStrokeEdges', () => {
  const maxXMismatch = (
    edgeA: { x: number; y: number }[],
    edgeB: { x: number; y: number }[],
  ): number => {
    const sampleCount = Math.min(edgeA.length, edgeB.length);
    let max = 0;
    for (let i = 0; i < sampleCount; i++) {
      const a = edgeA[i];
      const b = edgeB[i];
      if (!a || !b) continue;
      max = Math.max(max, Math.abs(a.x - b.x));
    }
    return max;
  };

  it('pairs a straight, symmetric ring so each index lines up at the same x position on both edges', () => {
    // A plain rectangle-shaped ring: lower edge left-to-right, then upper edge right-to-left (the
    // real ring's own continuous-loop direction) - both edges share the same 5 x positions.
    const lower = [0, 1, 2, 3, 4].map((x) => ({ x, y: 10 }));
    const upperTailToInner = [4, 3, 2, 1, 0].map((x) => ({ x, y: 0 }));
    const { edgeA, edgeB } = buildHairStrokeEdges([...lower, ...upperTailToInner]);

    expect(maxXMismatch(edgeA, edgeB)).toBeLessThan(0.5);
  });

  it('keeps the same pairing when one edge arches instead of running straight', () => {
    // A high-arch brow: the upper edge bows upward toward the middle (smaller y at the center),
    // the lower edge stays straight - same "same x, different shape" idea `makeParameterizedEyeFace`
    // already established for EYESHADOW's own multi-shape stress test.
    const lower = [0, 1, 2, 3, 4].map((x) => ({ x, y: 10 }));
    const archedUpperInnerToTail = [0, 1, 2, 3, 4].map((x) => {
      const t = x / 4;
      return { x, y: -Math.sin(Math.PI * t) * 5 };
    });
    const upperTailToInner = [...archedUpperInnerToTail].reverse();
    const { edgeA, edgeB } = buildHairStrokeEdges([...lower, ...upperTailToInner]);

    expect(maxXMismatch(edgeA, edgeB)).toBeLessThan(0.5);
  });

  it('degrades safely (shorter, not mismatched or throwing) when the ring length is odd', () => {
    // `half = Math.ceil(points.length / 2)` on an 11-point ring gives a 6-point edgeA and a
    // 5-point edgeB - the two edges genuinely can't be the same length here, so the caller must
    // sample only their common, safely-paired overlap (`Math.min` of the two).
    const points = Array.from({ length: 11 }, (_, i) => ({ x: i, y: i % 2 === 0 ? 10 : 0 }));
    const { edgeA, edgeB } = buildHairStrokeEdges(points);

    expect(edgeA.length).not.toBe(edgeB.length);
    expect(Math.min(edgeA.length, edgeB.length)).toBeGreaterThan(0);
  });
});
