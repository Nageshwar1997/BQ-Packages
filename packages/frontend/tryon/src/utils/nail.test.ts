import type { Category, Landmark, NormalizedLandmark } from '@mediapipe/tasks-vision';
import { describe, expect, it } from 'vitest';

import { getHandDetectionStatus } from './nail.js';

// Same convention as face.test.ts/eye.test.ts/hair.test.ts - `getHandDetectionStatus` is plain
// landmark-array math, no canvas/2D-context involved, so this runs in the default Node environment
// (no `@vitest-environment jsdom`, no `canvas` package) unlike nail.smoke.test.ts's own render
// tests.

const point = (x: number, y: number): NormalizedLandmark => ({ x, y, z: 0, visibility: 1 });
const worldPoint = (x: number, y: number, z = 0): Landmark => ({ x, y, z, visibility: 0 });

// Same fixtures as nail.smoke.test.ts's own (duplicated here per this app's own
// self-contained-per-test-file convention) - see that file's own comments for the full reasoning
// behind each one (why the wrist sits "below" the middle MCP, the real Left/Right calibration
// `NAIL_ORIENTATION_SIGN` this mirrors, etc.) - not repeated here to avoid drifting out of sync
// with the source of truth.
const makeFixtureHand = (offsetX = 0): NormalizedLandmark[] => {
  const hand = new Array<NormalizedLandmark>(21).fill(point(0.5, 0.9));
  const withOffset = (x: number, y: number) => point(x + offsetX, y);

  hand[3] = withOffset(0.27, 0.7); // thumb IP
  hand[4] = withOffset(0.25, 0.6); // thumb TIP
  hand[7] = withOffset(0.4, 0.45); // index DIP
  hand[8] = withOffset(0.4, 0.3); // index TIP
  hand[11] = withOffset(0.5, 0.38); // middle DIP
  hand[12] = withOffset(0.5, 0.2); // middle TIP
  hand[15] = withOffset(0.6, 0.45); // ring DIP
  hand[16] = withOffset(0.6, 0.3); // ring TIP
  hand[19] = withOffset(0.68, 0.55); // pinky DIP
  hand[20] = withOffset(0.68, 0.42); // pinky TIP

  return hand;
};

const makeFixtureWorldHand = (overrides: Partial<Record<number, Landmark>> = {}): Landmark[] => {
  const base: Record<number, Landmark> = {
    0: worldPoint(0, -0.85), // wrist
    2: worldPoint(-0.3, -0.2), // thumb MCP
    4: worldPoint(-0.5, -0.6), // thumb TIP
    5: worldPoint(-0.15, -0.8), // index MCP
    8: worldPoint(-0.15, -1.6), // index TIP
    9: worldPoint(0, 0), // middle MCP
    12: worldPoint(0, -1.7), // middle TIP
    13: worldPoint(0.15, -0.8), // ring MCP
    16: worldPoint(0.15, -1.55), // ring TIP
    17: worldPoint(0.3, -0.7), // pinky MCP
    20: worldPoint(0.3, -1.3), // pinky TIP
  };
  const merged = { ...base, ...overrides };

  const hand = new Array<Landmark>(21).fill(worldPoint(0, 0));
  for (const [index, landmark] of Object.entries(merged)) {
    hand[Number(index)] = landmark ?? worldPoint(0, 0);
  }
  return hand;
};

const makeFixtureHandedness = (categoryName: 'Left' | 'Right' = 'Left'): Category[] => [
  { score: 1, index: categoryName === 'Left' ? 0 : 1, categoryName, displayName: categoryName },
];

describe('getHandDetectionStatus', () => {
  it('returns "not-in-frame" when no hands are detected', () => {
    expect(getHandDetectionStatus([], [], [])).toBe('not-in-frame');
  });

  it('returns "detected" when a hand is detected and facing the camera correctly', () => {
    expect(
      getHandDetectionStatus(
        [makeFixtureHand()],
        [makeFixtureWorldHand()],
        [makeFixtureHandedness()],
      ),
    ).toBe('detected');
  });

  it('returns "turned" when a hand is detected but not facing the camera correctly (palm-facing or edge-on)', () => {
    // Same "index/pinky MCPs swapped" fixture nail.smoke.test.ts's own applyLiquidNail tests use
    // to simulate a hand that isn't facing the camera nail-side-up - previously this silently
    // painted zero nails with no on-screen explanation (the hand still counted as "detected"),
    // which is the exact bug this status exists to surface.
    const facingAwayWorldHand = makeFixtureWorldHand({
      5: worldPoint(0.3, -0.7),
      17: worldPoint(-0.15, -0.8),
    });

    expect(
      getHandDetectionStatus(
        [makeFixtureHand()],
        [facingAwayWorldHand],
        [makeFixtureHandedness('Left')],
      ),
    ).toBe('turned');
  });

  it('returns "detected" when at least one of multiple hands faces the camera correctly', () => {
    const facingAwayWorldHand = makeFixtureWorldHand({
      5: worldPoint(0.3, -0.7),
      17: worldPoint(-0.15, -0.8),
    });

    expect(
      getHandDetectionStatus(
        [makeFixtureHand(), makeFixtureHand(-0.4)],
        [facingAwayWorldHand, makeFixtureWorldHand()],
        [makeFixtureHandedness('Left'), makeFixtureHandedness('Left')],
      ),
    ).toBe('detected');
  });
});
