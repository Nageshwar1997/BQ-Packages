// @vitest-environment jsdom
//
// Same reasoning as lip.smoke.test.ts's identical header - `applyFoundationFace` calls
// `document.createElement('canvas')` internally (temp-canvas compositing), which needs a real
// `HTMLCanvasElement`/2D context that plain Node doesn't have. jsdom alone still isn't enough -
// its own `HTMLCanvasElement.getContext` returns `null` unless the `canvas` package (real
// Cairo-backed 2D rendering, already a devDependency for lip.smoke.test.ts) is present.
//
// The side-effect import right below is *not* dead weight - see lip.smoke.test.ts's own comment
// on why an explicit reference has to exist somewhere or unused-dependency tooling could flag
// `canvas` as unused and someone acts on that, silently breaking every jsdom-backed test file.
import 'canvas';

import type { NormalizedLandmark } from '@mediapipe/tasks-vision';
import { describe, expect, it } from 'vitest';

import {
  CHEEK_APPLE_LEFT_INDEX,
  CHEEK_APPLE_RIGHT_INDEX,
  LEFT_EYE_INDICES,
} from '../constants/face.js';
import {
  applyBbCreamFace,
  applyBlushFace,
  applyBronzerFace,
  applyCompactPowderFace,
  applyConcealerFace,
  applyContourFace,
  applyFoundationFace,
  applyHighlighterFace,
} from './face.js';
import { createOffscreenCtx } from './index.js';

// Same fixture-face approach as lip.smoke.test.ts (see its own comment) - a deterministic
// sunflower-seed spiral guarantees every index `applyFoundationFace` might read (face oval,
// eyes, eyebrows, mouth) resolves to a valid, distinct, in-bounds point, without needing real
// anatomical positions for a smoke test that only checks "doesn't throw, paints something".
const FACE_MESH_POINT_COUNT = 478;

const makeFixtureFace = (): NormalizedLandmark[] => {
  const goldenAngle = Math.PI * (3 - Math.sqrt(5));
  return Array.from({ length: FACE_MESH_POINT_COUNT }, (_, i) => {
    const radius = 0.4 * Math.sqrt(i / FACE_MESH_POINT_COUNT);
    const theta = i * goldenAngle;
    return {
      x: 0.5 + radius * Math.cos(theta),
      y: 0.5 + radius * Math.sin(theta),
      z: 0,
      visibility: 1,
    };
  });
};

const DIMENSION = { width: 200, height: 200 };
const RGB: [number, number, number] = [200, 150, 120];
const ALPHA = 0.45;

const makeCtx = (): CanvasRenderingContext2D => {
  const ctx = createOffscreenCtx(DIMENSION);
  if (!ctx) throw new Error('2D context unavailable - is the `canvas` package installed?');
  return ctx;
};

// Same reasoning as lip.smoke.test.ts's identical helper - confirms the fill actually painted
// *something*, not just "ran without throwing" (a landmark-index typo making `face[index]`
// always `undefined` could still pass a throw-only check while silently rendering nothing).
const hasNonTransparentPixel = (ctx: CanvasRenderingContext2D): boolean => {
  const { data } = ctx.getImageData(0, 0, DIMENSION.width, DIMENSION.height);
  for (let i = 3; i < data.length; i += 4) {
    if ((data[i] ?? 0) > 0) return true;
  }
  return false;
};

// Samples one specific pixel's RGBA channels (0-255 each) - the dedicated placement/color-math
// tests below need to inspect *specific* pixels (a finish's own documented anchor point), not
// just "something painted somewhere" - `hasNonTransparentPixel` above already covers that weaker
// check, a wrong-index bug could still paint *a* pixel while missing the real anchor entirely.
const getPixelAt = (ctx: CanvasRenderingContext2D, x: number, y: number) => {
  const { data } = ctx.getImageData(Math.round(x), Math.round(y), 1, 1);
  return { r: data[0] ?? 0, g: data[1] ?? 0, b: data[2] ?? 0, a: data[3] ?? 0 };
};

// Finds a "core" (fully-covered, not anti-aliased-edge) pixel - used for finishes whose exact
// painted extent depends on the fixture's own face-oval/blob shape (HIGHLIGHTER/CONTOUR/BRONZER/
// COMPACTPOWDER/BBCREAM), where asserting a specific hardcoded coordinate lands inside the clip
// would be a guess (confirmed the hard way - the exact-landmark approach below flaked on
// CHEEKBONE_LEFT_INDEX/JAW_HOLLOW_LEFT_INDEX, which this synthetic fixture's golden-spiral layout
// doesn't guarantee sit inside the traced face-oval). A flat fill/gradient's own *maximum* alpha
// anywhere in the image is always its true, fully-covered interior value - anti-aliasing only ever
// reduces coverage at a boundary, never increases it - so this scans once for that max, then
// returns the first pixel actually at it. Skips the same "read back a distorted, coverage-blended
// RGB at a partially-covered edge pixel" trap this app's own NAIL/HAIR test suites already avoid by
// filtering to core pixels, just computed relative to each render's own peak instead of a fixed
// absolute threshold (FACE's finishes render at a much lower nominal alpha than NAIL's opaque
// polish fills, so a fixed cutoff like NAIL's own would exclude every genuine core pixel here).
// Two renders built from the *same* fixture face/landmarks land on the same clip shape, so
// comparing this same first-found pixel between two such renders (see the BBCREAM-vs-FOUNDATION
// test) is still a valid, deterministic comparison, not a flaky one.
const findCorePixel = (ctx: CanvasRenderingContext2D) => {
  const { data } = ctx.getImageData(0, 0, DIMENSION.width, DIMENSION.height);

  let maxAlpha = 0;
  for (let i = 3; i < data.length; i += 4) {
    const a = data[i] ?? 0;
    if (a > maxAlpha) maxAlpha = a;
  }
  if (maxAlpha === 0) return null;

  for (let i = 0; i < data.length; i += 4) {
    if ((data[i + 3] ?? 0) === maxAlpha) {
      return { r: data[i] ?? 0, g: data[i + 1] ?? 0, b: data[i + 2] ?? 0, a: maxAlpha };
    }
  }
  return null;
};

describe('applyFoundationFace smoke test', () => {
  it('renders without throwing and paints at least one pixel', () => {
    const face = makeFixtureFace();
    const ctx = makeCtx();

    expect(() => {
      applyFoundationFace({ face, ctx, rgb: RGB, dimension: DIMENSION, alpha: ALPHA });
    }).not.toThrow();
    expect(hasNonTransparentPixel(ctx)).toBe(true);
  });
});

describe('applyBlushFace smoke test', () => {
  it('renders without throwing and paints at least one pixel', () => {
    const face = makeFixtureFace();
    const ctx = makeCtx();
    const rgb: [number, number, number] = [200, 150, 120];

    expect(() => {
      applyBlushFace({ face, ctx, rgb, dimension: DIMENSION, alpha: ALPHA });
    }).not.toThrow();
    expect(hasNonTransparentPixel(ctx)).toBe(true);
  });

  it('centers a feathered blob on each cheek-apple landmark', () => {
    const face = makeFixtureFace();
    const ctx = makeCtx();
    const rgb: [number, number, number] = [200, 150, 120];
    applyBlushFace({ face, ctx, rgb, dimension: DIMENSION, alpha: ALPHA });

    const leftCheek = face[CHEEK_APPLE_LEFT_INDEX];
    const rightCheek = face[CHEEK_APPLE_RIGHT_INDEX];
    if (!leftCheek || !rightCheek) throw new Error('fixture missing cheek-apple landmarks');

    // The blob's own radial gradient is brightest at dead center - a wrong anchor index would
    // still pass the basic smoke test above (it paints *some* pixel), but would miss this exact
    // spot.
    const leftPixel = getPixelAt(
      ctx,
      leftCheek.x * DIMENSION.width,
      leftCheek.y * DIMENSION.height,
    );
    const rightPixel = getPixelAt(
      ctx,
      rightCheek.x * DIMENSION.width,
      rightCheek.y * DIMENSION.height,
    );
    expect(leftPixel.a).toBeGreaterThan(0);
    expect(rightPixel.a).toBeGreaterThan(0);
  });
});

describe('applyConcealerFace smoke test', () => {
  it('renders without throwing and paints at least one pixel', () => {
    const face = makeFixtureFace();
    const ctx = makeCtx();
    const rgb: [number, number, number] = [230, 190, 160];

    expect(() => {
      applyConcealerFace({ face, ctx, rgb, dimension: DIMENSION, alpha: ALPHA });
    }).not.toThrow();
    expect(hasNonTransparentPixel(ctx)).toBe(true);
  });

  it('punches a fully transparent hole exactly at each eye, even though the under-eye blob paints nearby', () => {
    const face = makeFixtureFace();
    const ctx = makeCtx();
    const rgb: [number, number, number] = [230, 190, 160];
    applyConcealerFace({ face, ctx, rgb, dimension: DIMENSION, alpha: ALPHA });

    const leftEyePoints = LEFT_EYE_INDICES.map((index) => face[index]).filter(
      (point): point is NormalizedLandmark => !!point,
    );
    const centroid = leftEyePoints.reduce(
      (acc, point) => ({
        x: acc.x + point.x / leftEyePoints.length,
        y: acc.y + point.y / leftEyePoints.length,
      }),
      { x: 0, y: 0 },
    );

    // `eraseEyes`' `destination-out` pass forces this to exactly 0 regardless of whatever the
    // under-eye blob's own gradient painted there first - confirms the erase actually ran, not
    // just that the blob itself rendered somewhere (already covered above).
    const pixel = getPixelAt(ctx, centroid.x * DIMENSION.width, centroid.y * DIMENSION.height);
    expect(pixel.a).toBe(0);
  });
});

describe('applyHighlighterFace smoke test', () => {
  it('renders without throwing and paints at least one pixel', () => {
    const face = makeFixtureFace();
    const ctx = makeCtx();
    const rgb: [number, number, number] = [255, 235, 205];

    expect(() => {
      applyHighlighterFace({ face, ctx, rgb, dimension: DIMENSION, alpha: ALPHA });
    }).not.toThrow();
    expect(hasNonTransparentPixel(ctx)).toBe(true);
  });

  it('mixes the highlight color toward white, brighter than the raw shade', () => {
    const face = makeFixtureFace();
    const ctx = makeCtx();
    // A saturated shade (not already near-white) so a "mixed toward white" shift is measurable
    // on every channel, unlike the smoke test's own already-pale [255, 235, 205].
    const rgb: [number, number, number] = [180, 90, 90];
    applyHighlighterFace({ face, ctx, rgb, dimension: DIMENSION, alpha: ALPHA });

    const pixel = findCorePixel(ctx);
    if (!pixel) throw new Error('expected at least one painted pixel');

    // `mixTowardWhite` only ever raises each channel toward 255 - the glow should read brighter
    // than the raw shade, never darker or a different hue.
    expect(pixel.r).toBeGreaterThan(rgb[0]);
    expect(pixel.g).toBeGreaterThan(rgb[1]);
    expect(pixel.b).toBeGreaterThan(rgb[2]);
  });
});

describe('applyContourFace smoke test', () => {
  it('renders without throwing and paints at least one pixel', () => {
    const face = makeFixtureFace();
    const ctx = makeCtx();
    const rgb: [number, number, number] = [150, 100, 80];

    expect(() => {
      applyContourFace({ face, ctx, rgb, dimension: DIMENSION, alpha: ALPHA });
    }).not.toThrow();
    expect(hasNonTransparentPixel(ctx)).toBe(true);
  });

  it('mixes the shadow color toward black, darker than the raw shade', () => {
    const face = makeFixtureFace();
    const ctx = makeCtx();
    const rgb: [number, number, number] = [150, 100, 80];
    applyContourFace({ face, ctx, rgb, dimension: DIMENSION, alpha: ALPHA });

    const pixel = findCorePixel(ctx);
    if (!pixel) throw new Error('expected at least one painted pixel');

    // `mixTowardBlack` only ever lowers each channel toward 0 - the shadow should read darker
    // than the raw shade, never lighter.
    expect(pixel.r).toBeLessThan(rgb[0]);
    expect(pixel.g).toBeLessThan(rgb[1]);
    expect(pixel.b).toBeLessThan(rgb[2]);
  });
});

describe('applyBronzerFace smoke test', () => {
  it('renders without throwing and paints at least one pixel', () => {
    const face = makeFixtureFace();
    const ctx = makeCtx();
    const rgb: [number, number, number] = [180, 130, 90];

    expect(() => {
      applyBronzerFace({ face, ctx, rgb, dimension: DIMENSION, alpha: ALPHA });
    }).not.toThrow();
    expect(hasNonTransparentPixel(ctx)).toBe(true);
  });

  it('warms the shade (more red, less blue) before the full-face wash', () => {
    const face = makeFixtureFace();
    const ctx = makeCtx();
    const rgb: [number, number, number] = [180, 130, 90];
    applyBronzerFace({ face, ctx, rgb, dimension: DIMENSION, alpha: ALPHA });

    const pixel = findCorePixel(ctx);
    if (!pixel) throw new Error('expected at least one painted pixel');

    // `applyWarmShift` only ever raises red (plus a smaller green bump) and lowers blue - over a
    // fully-transparent background the rendered RGB reads back as the exact warmed color
    // regardless of alpha, so this confirms the actual hue shift, not just "something painted".
    expect(pixel.r).toBeGreaterThan(rgb[0]);
    expect(pixel.b).toBeLessThan(rgb[2]);
  });
});

describe('applyBbCreamFace smoke test', () => {
  it('renders without throwing and paints at least one pixel', () => {
    const face = makeFixtureFace();
    const ctx = makeCtx();
    const rgb: [number, number, number] = [235, 200, 175];

    expect(() => {
      applyBbCreamFace({ face, ctx, rgb, dimension: DIMENSION, alpha: ALPHA });
    }).not.toThrow();
    expect(hasNonTransparentPixel(ctx)).toBe(true);
  });

  it('reads sheerer (lower alpha) than FOUNDATION at the same rgb/intensity input', () => {
    const face = makeFixtureFace();
    const rgb: [number, number, number] = [235, 200, 175];

    const foundationCtx = makeCtx();
    applyFoundationFace({ face, ctx: foundationCtx, rgb, dimension: DIMENSION, alpha: ALPHA });
    const foundationPixel = findCorePixel(foundationCtx);

    const bbCreamCtx = makeCtx();
    applyBbCreamFace({ face, ctx: bbCreamCtx, rgb, dimension: DIMENSION, alpha: ALPHA });
    const bbCreamPixel = findCorePixel(bbCreamCtx);

    if (!foundationPixel || !bbCreamPixel) {
      throw new Error('expected both finishes to paint at least one pixel');
    }

    // `BBCREAM_BASE_ALPHA` (0.35) is lower than FOUNDATION's fixed 0.6 base - same rgb/alpha
    // input, same landmark-derived clip shape (so the same first-found pixel is a fair
    // comparison), should read measurably sheerer here.
    expect(bbCreamPixel.a).toBeLessThan(foundationPixel.a);
  });
});

describe('applyCompactPowderFace smoke test', () => {
  it('renders without throwing and paints at least one pixel', () => {
    const face = makeFixtureFace();
    const ctx = makeCtx();
    const rgb: [number, number, number] = [220, 190, 165];

    expect(() => {
      applyCompactPowderFace({ face, ctx, rgb, dimension: DIMENSION, alpha: ALPHA });
    }).not.toThrow();
    expect(hasNonTransparentPixel(ctx)).toBe(true);
  });

  it('desaturates the shade toward its own gray before the full-face wash', () => {
    const face = makeFixtureFace();
    const ctx = makeCtx();
    // A saturated shade so a "shrink the channel spread" shift is actually measurable, unlike
    // the smoke test's own already-fairly-neutral [220, 190, 165].
    const rgb: [number, number, number] = [200, 60, 60];
    applyCompactPowderFace({ face, ctx, rgb, dimension: DIMENSION, alpha: ALPHA });

    const pixel = findCorePixel(ctx);
    if (!pixel) throw new Error('expected at least one painted pixel');

    const rawSpread = Math.max(...rgb) - Math.min(...rgb);
    const renderedSpread =
      Math.max(pixel.r, pixel.g, pixel.b) - Math.min(pixel.r, pixel.g, pixel.b);

    // `desaturateTowardGray` only ever shrinks the gap between channels (flatter/less vibrant),
    // never widens it - confirms the actual color-math, not just "something painted".
    expect(renderedSpread).toBeLessThan(rawSpread);
  });
});
