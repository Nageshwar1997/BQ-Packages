// @vitest-environment jsdom
//
// Same reasoning as hair.smoke.test.ts's identical header - `applyLiquidNail` draws directly onto
// a real `CanvasRenderingContext2D`, which needs the `canvas` package (real Cairo-backed 2D
// rendering) since jsdom's own `HTMLCanvasElement.getContext` returns `null` otherwise.
//
// The side-effect import right below is *not* dead weight - see lip.smoke.test.ts's own comment
// on why an explicit reference has to exist somewhere or unused-dependency tooling could flag
// `canvas` as unused and someone acts on that, silently breaking every jsdom-backed test file.
//
// `getHandDetectionStatus`'s own tests live in nail.test.ts, not here - it's plain landmark-array
// math with no canvas involved, so it doesn't need this file's jsdom/`canvas` environment at all
// (same face.test.ts/eye.test.ts/hair.test.ts split as `isFaceTurnedTooMuch`/`isEyeTurnedTooMuch`/
// `getHairDetectionStatus`).
import 'canvas';

import type { Category, Landmark, NormalizedLandmark } from '@mediapipe/tasks-vision';
import { describe, expect, it } from 'vitest';

import { createOffscreenCtx } from './index.js';
import {
  applyChromeNail,
  applyDipPowderNail,
  applyGelNail,
  applyGlitterNail,
  applyLiquidNail,
} from './nail.js';

const DIMENSION = { width: 200, height: 200 };
const RGB: [number, number, number] = [180, 20, 90];
const ALPHA = 0.85;

const makeCtx = (): CanvasRenderingContext2D => {
  const ctx = createOffscreenCtx(DIMENSION);
  if (!ctx) throw new Error('2D context unavailable - is the `canvas` package installed?');
  return ctx;
};

const point = (x: number, y: number): NormalizedLandmark => ({ x, y, z: 0, visibility: 1 });
const worldPoint = (x: number, y: number, z = 0): Landmark => ({ x, y, z, visibility: 0 });

// A deterministic synthetic fixture, not a real HandLandmarker output - same "doesn't need real
// anatomical data for a smoke test that only checks doesn't-throw/paints-something" reasoning
// face.smoke.test.ts's fixture face and hair.smoke.test.ts's fixture mask already use. Index
// 0 (WRIST) and the PIP joints are left at a plausible filler position - `applyLiquidNail` only
// ever reads the near-joint/TIP pairs (`FINGER_JOINT_INDICES`) from *this* array, so only those 10
// indices need real, distinct on-screen positions - the MCP/wrist positions used for
// orientation/presence gating live in `makeFixtureWorldHand` below instead (a separate, real-world
// coordinate system, same as `HandLandmarkerResult` itself keeps `landmarks`/`worldLandmarks`
// independent).
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

// A plausible, fully-present, camera-facing synthetic hand in `worldLandmarks`-style real-world
// coordinates - satisfies both `isHandFacingCamera` (the wrist/MCP triangle's own normal points
// toward the camera) and `isFingerPresent` (every finger's own [MCP -> TIP] reach is a healthy
// fraction of the wrist-to-middle-MCP scale reference) for every finger by default. `overrides`
// lets individual tests below punch in a specific landmark (e.g. collapsing one finger's TIP onto
// its own MCP to simulate a missing finger) without rebuilding the whole hand each time.
const makeFixtureWorldHand = (overrides: Partial<Record<number, Landmark>> = {}): Landmark[] => {
  // Wrist placed "below" the middle MCP (rather than the more intuitive other way around) is
  // deliberate, not an oversight - it's what makes this fixture's own hand-plane normal actually
  // satisfy `isHandFacingCamera` under `NAIL_ORIENTATION_SIGN`'s own real-photo-calibrated value
  // (see that constant's own comment) - the two are swappable without changing anything else this
  // fixture needs to represent, since neither `isFingerPresent` nor the rest of this fixture's own
  // per-finger reach math cares which one sits where, only their distance apart.
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

// `HandLandmarkerResult.handedness` fixture - a single-element array (MediaPipe reports one
// classification per hand, `[0]` is always the top one) matching the shape `getEffectiveOrientationSign`
// (nail.ts) reads. Defaults to "Left" since `makeFixtureWorldHand` above is itself calibrated against
// `NAIL_ORIENTATION_SIGN`'s own "Left" reference photo - see that constant's own comment
// (constants/tryon-constants/nail.ts) for the real Left/Right calibration data this fixture mirrors.
const makeFixtureHandedness = (categoryName: 'Left' | 'Right' = 'Left'): Category[] => [
  { score: 1, index: categoryName === 'Left' ? 0 : 1, categoryName, displayName: categoryName },
];

// Same reasoning as face.smoke.test.ts's identical helper - confirms the fill actually painted
// *something*, not just "ran without throwing".
const countNonTransparentPixels = (ctx: CanvasRenderingContext2D): number => {
  const { data } = ctx.getImageData(0, 0, DIMENSION.width, DIMENSION.height);
  let count = 0;
  for (let i = 3; i < data.length; i += 4) {
    if ((data[i] ?? 0) > 0) count++;
  }
  return count;
};

describe('applyLiquidNail smoke test', () => {
  it('renders without throwing and paints at least one pixel for a detected hand', () => {
    const hands = [makeFixtureHand()];
    const worldHands = [makeFixtureWorldHand()];
    const handedness = [makeFixtureHandedness()];
    const ctx = makeCtx();

    expect(() => {
      applyLiquidNail({
        hands,
        worldHands,
        handedness,
        ctx,
        rgb: RGB,
        dimension: DIMENSION,
        alpha: ALPHA,
      });
    }).not.toThrow();
    expect(countNonTransparentPixels(ctx)).toBeGreaterThan(0);
  });

  it('renders nothing (but does not throw) when no hands are detected', () => {
    const ctx = makeCtx();

    expect(() => {
      applyLiquidNail({
        hands: [],
        worldHands: [],
        handedness: [],
        ctx,
        rgb: RGB,
        dimension: DIMENSION,
        alpha: ALPHA,
      });
    }).not.toThrow();
    expect(countNonTransparentPixels(ctx)).toBe(0);
  });

  it('paints more pixels for two detected hands than for one', () => {
    // Confirms every detected hand actually gets its own 5 nails drawn, not just the first one in
    // the array - `numHands: 2` (HandLandmarkerCache.ts) exists specifically so both hands can be
    // painted at once.
    const oneHandCtx = makeCtx();
    applyLiquidNail({
      hands: [makeFixtureHand()],
      worldHands: [makeFixtureWorldHand()],
      handedness: [makeFixtureHandedness()],
      ctx: oneHandCtx,
      rgb: RGB,
      dimension: DIMENSION,
      alpha: ALPHA,
    });

    const twoHandsCtx = makeCtx();
    // Second hand shifted well clear of the first (both in 0-1 normalized space) so their nails
    // don't overlap and cancel out in the pixel count.
    applyLiquidNail({
      hands: [makeFixtureHand(), makeFixtureHand(-0.4)],
      worldHands: [makeFixtureWorldHand(), makeFixtureWorldHand()],
      handedness: [makeFixtureHandedness(), makeFixtureHandedness()],
      ctx: twoHandsCtx,
      rgb: RGB,
      dimension: DIMENSION,
      alpha: ALPHA,
    });

    expect(countNonTransparentPixels(twoHandsCtx)).toBeGreaterThan(
      countNonTransparentPixels(oneHandCtx),
    );
  });

  it('handles a horizontally-pointing finger (rotation math, not just the vertical fixture case)', () => {
    // The fixture hand above happens to have every finger pointing roughly "up" (mostly vertical
    // DIP->TIP vectors) - this pins down that the per-instance rotation itself works for a finger
    // pointing sideways too, not just the specific angle the fixture already covers.
    const sidewaysHand = new Array<NormalizedLandmark>(21).fill(point(0.5, 0.5));
    sidewaysHand[7] = point(0.3, 0.5); // index DIP
    sidewaysHand[8] = point(0.6, 0.5); // index TIP, directly to the right of DIP

    const ctx = makeCtx();
    expect(() => {
      applyLiquidNail({
        hands: [sidewaysHand],
        worldHands: [makeFixtureWorldHand()],
        handedness: [makeFixtureHandedness()],
        ctx,
        rgb: RGB,
        dimension: DIMENSION,
        alpha: ALPHA,
      });
    }).not.toThrow();
    expect(countNonTransparentPixels(ctx)).toBeGreaterThan(0);
  });

  it('renders nothing for a hand not facing the camera (palm-facing or edge-on)', () => {
    // Same fixture, but with the index/pinky MCPs swapped - this flips the sign of the hand-plane
    // normal's own z-component (`isHandFacingCamera`), the same effect turning the physical hand
    // around would have.
    const facingAwayWorldHand = makeFixtureWorldHand({
      5: worldPoint(0.3, -0.7), // pinky MCP's own position, swapped onto index's slot
      17: worldPoint(-0.15, -0.8), // index MCP's own position, swapped onto pinky's slot
    });

    const ctx = makeCtx();
    applyLiquidNail({
      hands: [makeFixtureHand()],
      worldHands: [facingAwayWorldHand],
      handedness: [makeFixtureHandedness('Left')],
      ctx,
      rgb: RGB,
      dimension: DIMENSION,
      alpha: ALPHA,
    });

    expect(countNonTransparentPixels(ctx)).toBe(0);
  });

  // Hands are chiral (mirror images) - the exact same real-world "back facing camera" pose flips
  // the sign of the hand-plane normal's own z-component between a Left and a Right hand (confirmed
  // against real detected data: a reference photo detected as "Left" produced a raw z-ratio of
  // -0.77, and the same photo horizontally flipped - detected as "Right" - produced +0.80 for the
  // identical physical orientation, see `NAIL_ORIENTATION_SIGN`'s own comment in
  // constants/tryon-constants/nail.ts). These two tests pin down that `getEffectiveOrientationSign`
  // (nail.ts) actually accounts for this instead of always applying the "Left"-calibrated sign.
  it('renders a "Right" hand whose geometry is the mirror image of the default "Left" fixture', () => {
    // Identical geometry to the "facing away" fixture above (index/pinky MCPs swapped relative to
    // the default) - for a "Left" hand this reads as facing away (previous test), but this is
    // exactly what a genuine mirror-image "Right" hand's own back-facing pose looks like, so it
    // should render once handedness is accounted for.
    const mirroredWorldHand = makeFixtureWorldHand({
      5: worldPoint(0.3, -0.7),
      17: worldPoint(-0.15, -0.8),
    });

    const ctx = makeCtx();
    applyLiquidNail({
      hands: [makeFixtureHand()],
      worldHands: [mirroredWorldHand],
      handedness: [makeFixtureHandedness('Right')],
      ctx,
      rgb: RGB,
      dimension: DIMENSION,
      alpha: ALPHA,
    });

    expect(countNonTransparentPixels(ctx)).toBeGreaterThan(0);
  });

  it('renders nothing for a "Right" hand with the default fixture\'s own (un-mirrored) geometry', () => {
    // The default fixture's geometry only reads as "facing the camera" for the handedness it was
    // actually calibrated against ("Left") - the same geometry labeled "Right" is the mirror-image
    // hand turned the *other* way (effectively palm/edge-on for a genuine Right hand), so it should
    // be rejected.
    const ctx = makeCtx();
    applyLiquidNail({
      hands: [makeFixtureHand()],
      worldHands: [makeFixtureWorldHand()],
      handedness: [makeFixtureHandedness('Right')],
      ctx,
      rgb: RGB,
      dimension: DIMENSION,
      alpha: ALPHA,
    });

    expect(countNonTransparentPixels(ctx)).toBe(0);
  });

  it('skips an individual finger whose world landmarks look collapsed/absent', () => {
    // A "normal" hand (every finger present) versus the same hand with the ring finger's TIP
    // collapsed onto its own MCP (near-zero reach) - simulates a missing/fully-occluded finger,
    // which `isFingerPresent` should catch and skip while the other 4 fingers still render.
    const fullHandCtx = makeCtx();
    applyLiquidNail({
      hands: [makeFixtureHand()],
      worldHands: [makeFixtureWorldHand()],
      handedness: [makeFixtureHandedness()],
      ctx: fullHandCtx,
      rgb: RGB,
      dimension: DIMENSION,
      alpha: ALPHA,
    });

    const missingFingerCtx = makeCtx();
    applyLiquidNail({
      hands: [makeFixtureHand()],
      worldHands: [
        makeFixtureWorldHand({
          16: worldPoint(0.15, -0.81), // ring TIP collapsed right next to its own MCP (0.15, -0.8)
        }),
      ],
      handedness: [makeFixtureHandedness()],
      ctx: missingFingerCtx,
      rgb: RGB,
      dimension: DIMENSION,
      alpha: ALPHA,
    });

    expect(countNonTransparentPixels(missingFingerCtx)).toBeLessThan(
      countNonTransparentPixels(fullHandCtx),
    );
  });
});

// Average per-pixel (max channel - min channel) across only near-fully-opaque pixels (alpha > 200,
// same 0-255 scale as the other channels) - anti-aliased edge pixels are skipped since their alpha
// blending with the transparent background can shift channel ratios independent of the fill color
// itself. A pure gray has 0 spread; a vivid, fully-saturated color has a large one - this is the
// same "spread between channels" reading of saturation `desaturateTowardGray`'s own math (nail.ts)
// is built to shrink.
const averageCoreChannelSpread = (ctx: CanvasRenderingContext2D): number => {
  const { data } = ctx.getImageData(0, 0, DIMENSION.width, DIMENSION.height);
  let total = 0;
  let count = 0;
  for (let i = 0; i < data.length; i += 4) {
    if ((data[i + 3] ?? 0) <= 200) continue;
    const r = data[i] ?? 0;
    const g = data[i + 1] ?? 0;
    const b = data[i + 2] ?? 0;
    total += Math.max(r, g, b) - Math.min(r, g, b);
    count++;
  }
  return count > 0 ? total / count : 0;
};

// Range (max - min) of per-pixel luminance across only near-fully-opaque pixels, same
// core-pixel-only reasoning as `averageCoreChannelSpread` above. LIQUID's flat single-color fill
// should read as ~0 (every core pixel is the same color); GEL's highlight blob should read
// noticeably above 0, since it paints part of the nail brighter than the rest of the same fill.
const coreLuminanceRange = (ctx: CanvasRenderingContext2D): number => {
  const { data } = ctx.getImageData(0, 0, DIMENSION.width, DIMENSION.height);
  let min = Infinity;
  let max = -Infinity;
  for (let i = 0; i < data.length; i += 4) {
    if ((data[i + 3] ?? 0) <= 200) continue;
    const r = data[i] ?? 0;
    const g = data[i + 1] ?? 0;
    const b = data[i + 2] ?? 0;
    const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
    min = Math.min(min, luminance);
    max = Math.max(max, luminance);
  }
  return max >= min ? max - min : 0;
};

describe('applyGelNail smoke test', () => {
  it('renders without throwing and paints at least one pixel for a detected hand', () => {
    const ctx = makeCtx();

    expect(() => {
      applyGelNail({
        hands: [makeFixtureHand()],
        worldHands: [makeFixtureWorldHand()],
        handedness: [makeFixtureHandedness()],
        ctx,
        rgb: RGB,
        dimension: DIMENSION,
        alpha: ALPHA,
      });
    }).not.toThrow();
    expect(countNonTransparentPixels(ctx)).toBeGreaterThan(0);
  });

  it("adds a brighter highlight variation across each nail, unlike LIQUID's uniform flat fill", () => {
    const hands = [makeFixtureHand()];
    const worldHands = [makeFixtureWorldHand()];
    const handedness = [makeFixtureHandedness()];

    const liquidCtx = makeCtx();
    applyLiquidNail({
      hands,
      worldHands,
      handedness,
      ctx: liquidCtx,
      rgb: RGB,
      dimension: DIMENSION,
      alpha: ALPHA,
    });

    const gelCtx = makeCtx();
    applyGelNail({
      hands,
      worldHands,
      handedness,
      ctx: gelCtx,
      rgb: RGB,
      dimension: DIMENSION,
      alpha: ALPHA,
    });

    expect(coreLuminanceRange(gelCtx)).toBeGreaterThan(coreLuminanceRange(liquidCtx));
  });
});

describe('applyDipPowderNail smoke test', () => {
  it('renders without throwing and paints at least one pixel for a detected hand', () => {
    const ctx = makeCtx();

    expect(() => {
      applyDipPowderNail({
        hands: [makeFixtureHand()],
        worldHands: [makeFixtureWorldHand()],
        handedness: [makeFixtureHandedness()],
        ctx,
        rgb: RGB,
        dimension: DIMENSION,
        alpha: ALPHA,
      });
    }).not.toThrow();
    expect(countNonTransparentPixels(ctx)).toBeGreaterThan(0);
  });

  it("desaturates the fill compared to LIQUID's own raw-color fill", () => {
    const hands = [makeFixtureHand()];
    const worldHands = [makeFixtureWorldHand()];
    const handedness = [makeFixtureHandedness()];

    const liquidCtx = makeCtx();
    applyLiquidNail({
      hands,
      worldHands,
      handedness,
      ctx: liquidCtx,
      rgb: RGB,
      dimension: DIMENSION,
      alpha: ALPHA,
    });

    const dipPowderCtx = makeCtx();
    applyDipPowderNail({
      hands,
      worldHands,
      handedness,
      ctx: dipPowderCtx,
      rgb: RGB,
      dimension: DIMENSION,
      alpha: ALPHA,
    });

    expect(averageCoreChannelSpread(dipPowderCtx)).toBeLessThan(
      averageCoreChannelSpread(liquidCtx),
    );
  });
});

describe('applyGlitterNail smoke test', () => {
  it('renders without throwing and paints at least one pixel for a detected hand', () => {
    const ctx = makeCtx();

    expect(() => {
      applyGlitterNail({
        hands: [makeFixtureHand()],
        worldHands: [makeFixtureWorldHand()],
        handedness: [makeFixtureHandedness()],
        ctx,
        rgb: RGB,
        dimension: DIMENSION,
        alpha: ALPHA,
      });
    }).not.toThrow();
    expect(countNonTransparentPixels(ctx)).toBeGreaterThan(0);
  });

  it("adds bright sparkle variation across each nail, unlike LIQUID's uniform flat fill", () => {
    const hands = [makeFixtureHand()];
    const worldHands = [makeFixtureWorldHand()];
    const handedness = [makeFixtureHandedness()];

    const liquidCtx = makeCtx();
    applyLiquidNail({
      hands,
      worldHands,
      handedness,
      ctx: liquidCtx,
      rgb: RGB,
      dimension: DIMENSION,
      alpha: ALPHA,
    });

    const glitterCtx = makeCtx();
    applyGlitterNail({
      hands,
      worldHands,
      handedness,
      ctx: glitterCtx,
      rgb: RGB,
      dimension: DIMENSION,
      alpha: ALPHA,
    });

    expect(coreLuminanceRange(glitterCtx)).toBeGreaterThan(coreLuminanceRange(liquidCtx));
  });

  // Same "explicit headroom against parallel-worker scheduling contention" reasoning as HAIR's own
  // identical HIGHLIGHTS determinism test (hair.smoke.test.ts) - two full canvas renders + a
  // full-frame `getImageData` comparison have been observed to trip vitest's 5000ms default under
  // full-suite load (13+ workers spawning at once), even though the render itself is fast alone.
  it('renders the exact same sparkle pattern across repeated calls (fixed-seed PRNG, no per-frame flicker)', () => {
    // Same reasoning as HAIR's own HIGHLIGHTS streak-pattern test - a fixed seed means two
    // independent renders of the same input must produce byte-identical pixels, unlike
    // `Math.random()` which would scatter sparkles differently every call.
    const hands = [makeFixtureHand()];
    const worldHands = [makeFixtureWorldHand()];
    const handedness = [makeFixtureHandedness()];

    const firstCtx = makeCtx();
    applyGlitterNail({
      hands,
      worldHands,
      handedness,
      ctx: firstCtx,
      rgb: RGB,
      dimension: DIMENSION,
      alpha: ALPHA,
    });

    const secondCtx = makeCtx();
    applyGlitterNail({
      hands,
      worldHands,
      handedness,
      ctx: secondCtx,
      rgb: RGB,
      dimension: DIMENSION,
      alpha: ALPHA,
    });

    expect(firstCtx.getImageData(0, 0, DIMENSION.width, DIMENSION.height).data).toEqual(
      secondCtx.getImageData(0, 0, DIMENSION.width, DIMENSION.height).data,
    );
  }, 15000);
});

describe('applyChromeNail smoke test', () => {
  it('renders without throwing and paints at least one pixel for a detected hand', () => {
    const ctx = makeCtx();

    expect(() => {
      applyChromeNail({
        hands: [makeFixtureHand()],
        worldHands: [makeFixtureWorldHand()],
        handedness: [makeFixtureHandedness()],
        ctx,
        rgb: RGB,
        dimension: DIMENSION,
        alpha: ALPHA,
      });
    }).not.toThrow();
    expect(countNonTransparentPixels(ctx)).toBeGreaterThan(0);
  });

  it("adds a banded metallic-gradient variation across each nail, unlike LIQUID's uniform flat fill", () => {
    const hands = [makeFixtureHand()];
    const worldHands = [makeFixtureWorldHand()];
    const handedness = [makeFixtureHandedness()];

    const liquidCtx = makeCtx();
    applyLiquidNail({
      hands,
      worldHands,
      handedness,
      ctx: liquidCtx,
      rgb: RGB,
      dimension: DIMENSION,
      alpha: ALPHA,
    });

    const chromeCtx = makeCtx();
    applyChromeNail({
      hands,
      worldHands,
      handedness,
      ctx: chromeCtx,
      rgb: RGB,
      dimension: DIMENSION,
      alpha: ALPHA,
    });

    expect(coreLuminanceRange(chromeCtx)).toBeGreaterThan(coreLuminanceRange(liquidCtx));
  });

  // Same "explicit headroom against parallel-worker scheduling contention" reasoning as GLITTER's
  // own identical determinism test above (and HAIR's HIGHLIGHTS one) - two full canvas renders +
  // a full-frame `getImageData` comparison have been observed to trip vitest's 5000ms default
  // under full-suite load, even though the render itself is fast alone.
  it('renders the exact same gradient across repeated calls (deterministic, no per-frame flicker)', () => {
    const hands = [makeFixtureHand()];
    const worldHands = [makeFixtureWorldHand()];
    const handedness = [makeFixtureHandedness()];

    const firstCtx = makeCtx();
    applyChromeNail({
      hands,
      worldHands,
      handedness,
      ctx: firstCtx,
      rgb: RGB,
      dimension: DIMENSION,
      alpha: ALPHA,
    });

    const secondCtx = makeCtx();
    applyChromeNail({
      hands,
      worldHands,
      handedness,
      ctx: secondCtx,
      rgb: RGB,
      dimension: DIMENSION,
      alpha: ALPHA,
    });

    expect(firstCtx.getImageData(0, 0, DIMENSION.width, DIMENSION.height).data).toEqual(
      secondCtx.getImageData(0, 0, DIMENSION.width, DIMENSION.height).data,
    );
  }, 15000);
});
