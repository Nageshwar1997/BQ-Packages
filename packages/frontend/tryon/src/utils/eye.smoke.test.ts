// @vitest-environment jsdom
//
// Same reasoning as face.smoke.test.ts/lip.smoke.test.ts's identical header - `applyEyelinerEye`
// calls `document.createElement('canvas')` internally (temp-canvas compositing, via
// `createOffscreenCtx`), which needs a real `HTMLCanvasElement`/2D context that plain Node
// doesn't have. jsdom alone still isn't enough - its own `HTMLCanvasElement.getContext` returns
// `null` unless the `canvas` package (real Cairo-backed 2D rendering, already a devDependency)
// is present.
//
// The side-effect import right below is *not* dead weight - see lip.smoke.test.ts's own comment
// on why an explicit reference has to exist somewhere or unused-dependency tooling could flag
// `canvas` as unused and someone acts on that, silently breaking every jsdom-backed test file.
import 'canvas';

import type { NormalizedLandmark } from '@mediapipe/tasks-vision';
import { describe, expect, it } from 'vitest';

import {
  EYEBROW_PATTERNS,
  EYELINER_PATTERNS,
  EYESHADOW_PATTERNS,
  KAJAL_PATTERNS,
  LASHES_PATTERNS,
  MASCARA_PATTERNS,
} from '../constants/eye.js';
import {
  applyBrowgelEye,
  applyEyebrowEye,
  applyEyelinerEye,
  applyEyeshadowEye,
  applyKajalEye,
  applyLashesEye,
  applyMascaraEye,
} from './eye.js';
import { createOffscreenCtx } from './index.js';

// A realistic (non-spiral) eye/brow fixture for the geometry-precision regression tests below -
// the sunflower-spiral fixture above is fine for "doesn't throw, paints something" smoke checks,
// but every claim these tests actually verify (wing connects with zero gap, brow fill reaches the
// tail landmark, curl pulls a lash toward vertical, `lengthShape` makes outer/center lashes longer)
// depends on a real almond-eye curve with a genuine sharp bend at the outer corner - see
// `buildTaperedRibbonPath`'s own comment on why "a bilateral-symmetric synthetic fixture never
// reproduced it, since it never got a real bend that sharp on either side". Left eye built directly
// from real proportions; right eye mirrored across x=0.5 so both `getOrderedEyeArcs` calls resolve
// sensibly. Every other one of the 478 points keeps the spiral filler - nothing else these
// functions read (`applyEyelinerEye` etc. only ever touch the eye/eyebrow/nose/cheekbone indices).
const makeRealisticEyeFace = (): NormalizedLandmark[] => {
  const face = makeFixtureFace();
  const set = (index: number, x: number, y: number) => {
    face[index] = { x, y, z: 0, visibility: 1 };
  };

  // Left eye upper arc (LEFT_EYE_UPPER_INDICES = [33,246,161,160,159,158,157,173,133]), inner
  // corner (near nose, x=0.46) to outer/temporal corner (x=0.30) - the last two points bend
  // sharply downward, mimicking a real outer-corner crease rather than a smooth continuation.
  set(33, 0.46, 0.465);
  set(246, 0.445, 0.45);
  set(161, 0.425, 0.435);
  set(160, 0.405, 0.428);
  set(159, 0.385, 0.425);
  set(158, 0.365, 0.43);
  set(157, 0.345, 0.44);
  set(173, 0.325, 0.452);
  set(133, 0.3, 0.47);

  // Left eye lower arc (LEFT_EYE_LOWER_INDICES = [133,155,154,153,145,144,163,33]), sharing both
  // corners with the upper arc above so the two form one closed eye shape.
  set(155, 0.325, 0.485);
  set(154, 0.35, 0.495);
  set(153, 0.375, 0.5);
  set(145, 0.4, 0.498);
  set(144, 0.425, 0.49);
  set(163, 0.445, 0.478);

  // Left eyebrow ring (LEFT_EYEBROW_INDICES = [70,63,105,66,107,55,65,52,53,46,156]) - a lower
  // edge (near the eye) and an upper edge sitting above it, plus the real tail-side landmark (156)
  // appended past the ring's own raw extent, down toward the eye's outer corner - see
  // `LEFT_EYEBROW_INDICES`'s own comment for why that point exists.
  set(70, 0.44, 0.4);
  set(63, 0.41, 0.39);
  set(105, 0.38, 0.383);
  set(66, 0.35, 0.38);
  set(107, 0.32, 0.383);
  set(55, 0.32, 0.355);
  set(65, 0.35, 0.345);
  set(52, 0.38, 0.34);
  set(53, 0.41, 0.345);
  set(46, 0.44, 0.355);
  set(156, 0.3, 0.46);

  // Right eye/eyebrow - mirror image of the left across x=0.5 (same indices' worth of points,
  // right-side constants).
  set(362, 0.54, 0.465);
  set(398, 0.555, 0.45);
  set(384, 0.575, 0.435);
  set(385, 0.595, 0.428);
  set(386, 0.615, 0.425);
  set(387, 0.635, 0.43);
  set(388, 0.655, 0.44);
  set(466, 0.675, 0.452);
  set(263, 0.7, 0.47);

  set(249, 0.675, 0.485);
  set(390, 0.65, 0.495);
  set(373, 0.625, 0.5);
  set(374, 0.6, 0.498);
  set(380, 0.575, 0.49);
  set(381, 0.56, 0.478);
  set(382, 0.55, 0.472);

  set(300, 0.56, 0.4);
  set(293, 0.59, 0.39);
  set(334, 0.62, 0.383);
  set(296, 0.65, 0.38);
  set(336, 0.68, 0.383);
  set(285, 0.68, 0.355);
  set(295, 0.65, 0.345);
  set(282, 0.62, 0.34);
  set(283, 0.59, 0.345);
  set(276, 0.56, 0.355);
  set(383, 0.7, 0.46);

  // NOSE_TIP_INDEX=1 sits between the two eyes, at their shared inner-corner height.
  set(1, 0.5, 0.5);

  return face;
};

// Flood-fills the alpha channel (any pixel with alpha>0 counts as "painted") and returns the
// number of 4-connected components - the exact check this session's own manual wing-gap
// verification did by hand (see EYELINER.md's design notes), now committed as an automated
// regression instead of a one-off browser script.
const countConnectedComponents = (
  ctx: CanvasRenderingContext2D,
  region: { x0: number; y0: number; x1: number; y1: number },
): number => {
  const { data } = ctx.getImageData(0, 0, DIMENSION.width, DIMENSION.height);
  const w = DIMENSION.width;
  const painted = (x: number, y: number) => (data[(y * w + x) * 4 + 3] ?? 0) > 0;

  const visited = new Set<number>();
  let components = 0;

  for (let y = region.y0; y < region.y1; y++) {
    for (let x = region.x0; x < region.x1; x++) {
      const key = y * w + x;
      if (visited.has(key) || !painted(x, y)) continue;
      components++;
      const stack: [number, number][] = [[x, y]];
      visited.add(key);
      while (stack.length) {
        const next = stack.pop();
        if (!next) continue;
        const [cx, cy] = next;
        const neighbors: [number, number][] = [
          [cx + 1, cy],
          [cx - 1, cy],
          [cx, cy + 1],
          [cx, cy - 1],
        ];
        for (const [nx, ny] of neighbors) {
          if (nx < region.x0 || nx >= region.x1 || ny < region.y0 || ny >= region.y1) continue;
          const nKey = ny * w + nx;
          if (visited.has(nKey) || !painted(nx, ny)) continue;
          visited.add(nKey);
          stack.push([nx, ny]);
        }
      }
    }
  }

  return components;
};

// Same fixture-face approach as face.smoke.test.ts/lip.smoke.test.ts (see their own comments) -
// a deterministic sunflower-seed spiral guarantees every index any of these functions might read
// (both eye rings, nose tip) resolves to a valid, distinct, in-bounds point, without needing
// real anatomical positions for a smoke test that only checks "doesn't throw, paints something".
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
const RGB: [number, number, number] = [40, 30, 30];
const ALPHA = 0.8;

const hasNonTransparentPixel = (ctx: CanvasRenderingContext2D): boolean => {
  const { data } = ctx.getImageData(0, 0, DIMENSION.width, DIMENSION.height);
  for (let i = 3; i < data.length; i += 4) {
    if ((data[i] ?? 0) > 0) return true;
  }
  return false;
};

describe('applyEyelinerEye smoke test', () => {
  it.each(EYELINER_PATTERNS)(
    '$id pattern renders without throwing and paints at least one pixel',
    ({ id }) => {
      const face = makeFixtureFace();
      const ctx = createOffscreenCtx(DIMENSION);
      if (!ctx) throw new Error('2D context unavailable - is the `canvas` package installed?');

      expect(() => {
        applyEyelinerEye({ face, ctx, rgb: RGB, dimension: DIMENSION, alpha: ALPHA, pattern: id });
      }).not.toThrow();
      expect(hasNonTransparentPixel(ctx)).toBe(true);
    },
  );

  it('an unrecognized pattern id renders nothing rather than throwing', () => {
    const face = makeFixtureFace();
    const ctx = createOffscreenCtx(DIMENSION);
    if (!ctx) throw new Error('2D context unavailable - is the `canvas` package installed?');

    expect(() => {
      applyEyelinerEye({
        face,
        ctx,
        rgb: RGB,
        dimension: DIMENSION,
        alpha: ALPHA,
        pattern: 'NOT_A_REAL_PATTERN',
      });
    }).not.toThrow();
    expect(hasNonTransparentPixel(ctx)).toBe(false);
  });
});

describe('applyKajalEye smoke test', () => {
  it.each(KAJAL_PATTERNS)(
    '$id pattern renders without throwing and paints at least one pixel',
    ({ id }) => {
      const face = makeFixtureFace();
      const ctx = createOffscreenCtx(DIMENSION);
      if (!ctx) throw new Error('2D context unavailable - is the `canvas` package installed?');

      expect(() => {
        applyKajalEye({ face, ctx, rgb: RGB, dimension: DIMENSION, alpha: ALPHA, pattern: id });
      }).not.toThrow();
      expect(hasNonTransparentPixel(ctx)).toBe(true);
    },
  );

  it('an unrecognized pattern id renders nothing rather than throwing', () => {
    const face = makeFixtureFace();
    const ctx = createOffscreenCtx(DIMENSION);
    if (!ctx) throw new Error('2D context unavailable - is the `canvas` package installed?');

    expect(() => {
      applyKajalEye({
        face,
        ctx,
        rgb: RGB,
        dimension: DIMENSION,
        alpha: ALPHA,
        pattern: 'NOT_A_REAL_PATTERN',
      });
    }).not.toThrow();
    expect(hasNonTransparentPixel(ctx)).toBe(false);
  });

  // KAJAL's own EYELINER-id cross-contamination guard - `applyKajalEye`'s lookup is against
  // `KAJAL_PATTERN_TUNING` specifically, not any pattern id that merely exists somewhere in this
  // file. A stale `state.pattern` left over from switching finishes without re-picking one should
  // render nothing, not silently reuse EYELINER's own tuning for a KAJAL pick (see
  // `applyKajalEye`'s own comment on why).
  it('an EYELINER pattern id renders nothing when applied as a KAJAL pattern', () => {
    const face = makeFixtureFace();
    const ctx = createOffscreenCtx(DIMENSION);
    if (!ctx) throw new Error('2D context unavailable - is the `canvas` package installed?');

    expect(() => {
      applyKajalEye({
        face,
        ctx,
        rgb: RGB,
        dimension: DIMENSION,
        alpha: ALPHA,
        pattern: 'CLASSIC_THIN',
      });
    }).not.toThrow();
    expect(hasNonTransparentPixel(ctx)).toBe(false);
  });
});

describe('applyEyeshadowEye smoke test', () => {
  it.each(EYESHADOW_PATTERNS)(
    '$id pattern renders without throwing and paints at least one pixel',
    ({ id }) => {
      const face = makeFixtureFace();
      const ctx = createOffscreenCtx(DIMENSION);
      if (!ctx) throw new Error('2D context unavailable - is the `canvas` package installed?');

      expect(() => {
        applyEyeshadowEye({ face, ctx, rgb: RGB, dimension: DIMENSION, alpha: ALPHA, pattern: id });
      }).not.toThrow();
      expect(hasNonTransparentPixel(ctx)).toBe(true);
    },
  );

  it('an unrecognized pattern id renders nothing rather than throwing', () => {
    const face = makeFixtureFace();
    const ctx = createOffscreenCtx(DIMENSION);
    if (!ctx) throw new Error('2D context unavailable - is the `canvas` package installed?');

    expect(() => {
      applyEyeshadowEye({
        face,
        ctx,
        rgb: RGB,
        dimension: DIMENSION,
        alpha: ALPHA,
        pattern: 'NOT_A_REAL_PATTERN',
      });
    }).not.toThrow();
    expect(hasNonTransparentPixel(ctx)).toBe(false);
  });

  // Same cross-contamination guard as KAJAL's own - EYESHADOW's lookup is against
  // `EYESHADOW_PATTERN_TUNING` specifically, not any pattern id that merely exists somewhere in
  // this file.
  it('an EYELINER pattern id renders nothing when applied as an EYESHADOW pattern', () => {
    const face = makeFixtureFace();
    const ctx = createOffscreenCtx(DIMENSION);
    if (!ctx) throw new Error('2D context unavailable - is the `canvas` package installed?');

    expect(() => {
      applyEyeshadowEye({
        face,
        ctx,
        rgb: RGB,
        dimension: DIMENSION,
        alpha: ALPHA,
        pattern: 'CLASSIC_THIN',
      });
    }).not.toThrow();
    expect(hasNonTransparentPixel(ctx)).toBe(false);
  });
});

describe('applyEyebrowEye smoke test', () => {
  it.each(EYEBROW_PATTERNS)(
    '$id pattern renders without throwing and paints at least one pixel',
    ({ id }) => {
      const face = makeFixtureFace();
      const ctx = createOffscreenCtx(DIMENSION);
      if (!ctx) throw new Error('2D context unavailable - is the `canvas` package installed?');

      expect(() => {
        applyEyebrowEye({ face, ctx, rgb: RGB, dimension: DIMENSION, alpha: ALPHA, pattern: id });
      }).not.toThrow();
      expect(hasNonTransparentPixel(ctx)).toBe(true);
    },
  );

  it('an unrecognized pattern id renders nothing rather than throwing', () => {
    const face = makeFixtureFace();
    const ctx = createOffscreenCtx(DIMENSION);
    if (!ctx) throw new Error('2D context unavailable - is the `canvas` package installed?');

    expect(() => {
      applyEyebrowEye({
        face,
        ctx,
        rgb: RGB,
        dimension: DIMENSION,
        alpha: ALPHA,
        pattern: 'NOT_A_REAL_PATTERN',
      });
    }).not.toThrow();
    expect(hasNonTransparentPixel(ctx)).toBe(false);
  });

  // Same cross-contamination guard as KAJAL/EYESHADOW's own - EYEBROW's lookup is against
  // `EYEBROW_PATTERN_TUNING` specifically, not any pattern id that merely exists somewhere in
  // this file.
  it('an EYELINER pattern id renders nothing when applied as an EYEBROW pattern', () => {
    const face = makeFixtureFace();
    const ctx = createOffscreenCtx(DIMENSION);
    if (!ctx) throw new Error('2D context unavailable - is the `canvas` package installed?');

    expect(() => {
      applyEyebrowEye({
        face,
        ctx,
        rgb: RGB,
        dimension: DIMENSION,
        alpha: ALPHA,
        pattern: 'CLASSIC_THIN',
      });
    }).not.toThrow();
    expect(hasNonTransparentPixel(ctx)).toBe(false);
  });
});

// BROWGEL has no pattern picker (color/alpha only - see BROWGEL_TUNING's own comment), so unlike
// every other EYE finish's own smoke-test block, there's no per-pattern `it.each`, no
// unrecognized-pattern-id case, and no cross-contamination case to check - `applyBrowgelEye` never
// reads `pattern` at all, so passing a stray value there can't affect anything.
describe('applyBrowgelEye smoke test', () => {
  it('renders without throwing and paints at least one pixel', () => {
    const face = makeFixtureFace();
    const ctx = createOffscreenCtx(DIMENSION);
    if (!ctx) throw new Error('2D context unavailable - is the `canvas` package installed?');

    expect(() => {
      applyBrowgelEye({ face, ctx, rgb: RGB, dimension: DIMENSION, alpha: ALPHA, pattern: '' });
    }).not.toThrow();
    expect(hasNonTransparentPixel(ctx)).toBe(true);
  });
});

describe('applyMascaraEye smoke test', () => {
  it.each(MASCARA_PATTERNS)(
    '$id pattern renders without throwing and paints at least one pixel',
    ({ id }) => {
      const face = makeFixtureFace();
      const ctx = createOffscreenCtx(DIMENSION);
      if (!ctx) throw new Error('2D context unavailable - is the `canvas` package installed?');

      expect(() => {
        applyMascaraEye({ face, ctx, rgb: RGB, dimension: DIMENSION, alpha: ALPHA, pattern: id });
      }).not.toThrow();
      expect(hasNonTransparentPixel(ctx)).toBe(true);
    },
  );

  it('an unrecognized pattern id renders nothing rather than throwing', () => {
    const face = makeFixtureFace();
    const ctx = createOffscreenCtx(DIMENSION);
    if (!ctx) throw new Error('2D context unavailable - is the `canvas` package installed?');

    expect(() => {
      applyMascaraEye({
        face,
        ctx,
        rgb: RGB,
        dimension: DIMENSION,
        alpha: ALPHA,
        pattern: 'NOT_A_REAL_PATTERN',
      });
    }).not.toThrow();
    expect(hasNonTransparentPixel(ctx)).toBe(false);
  });

  // Same cross-contamination guard as KAJAL/EYESHADOW/EYEBROW's own - MASCARA's lookup is against
  // `MASCARA_PATTERN_TUNING` specifically, not any pattern id that merely exists somewhere in this
  // file.
  it('an EYELINER pattern id renders nothing when applied as a MASCARA pattern', () => {
    const face = makeFixtureFace();
    const ctx = createOffscreenCtx(DIMENSION);
    if (!ctx) throw new Error('2D context unavailable - is the `canvas` package installed?');

    expect(() => {
      applyMascaraEye({
        face,
        ctx,
        rgb: RGB,
        dimension: DIMENSION,
        alpha: ALPHA,
        pattern: 'CLASSIC_THIN',
      });
    }).not.toThrow();
    expect(hasNonTransparentPixel(ctx)).toBe(false);
  });
});

describe('applyLashesEye smoke test', () => {
  it.each(LASHES_PATTERNS)(
    '$id pattern renders without throwing and paints at least one pixel',
    ({ id }) => {
      const face = makeFixtureFace();
      const ctx = createOffscreenCtx(DIMENSION);
      if (!ctx) throw new Error('2D context unavailable - is the `canvas` package installed?');

      expect(() => {
        applyLashesEye({ face, ctx, rgb: RGB, dimension: DIMENSION, alpha: ALPHA, pattern: id });
      }).not.toThrow();
      expect(hasNonTransparentPixel(ctx)).toBe(true);
    },
  );

  it('an unrecognized pattern id renders nothing rather than throwing', () => {
    const face = makeFixtureFace();
    const ctx = createOffscreenCtx(DIMENSION);
    if (!ctx) throw new Error('2D context unavailable - is the `canvas` package installed?');

    expect(() => {
      applyLashesEye({
        face,
        ctx,
        rgb: RGB,
        dimension: DIMENSION,
        alpha: ALPHA,
        pattern: 'NOT_A_REAL_PATTERN',
      });
    }).not.toThrow();
    expect(hasNonTransparentPixel(ctx)).toBe(false);
  });

  // Same cross-contamination guard as every other pattern-bearing EYE finish's own - LASHES'
  // lookup is against `LASHES_PATTERN_TUNING` specifically, not any pattern id that merely exists
  // somewhere in this file, even MASCARA's own (despite both finishes sharing the exact same
  // underlying lash-stroke primitive).
  it('a MASCARA pattern id renders nothing when applied as a LASHES pattern', () => {
    const face = makeFixtureFace();
    const ctx = createOffscreenCtx(DIMENSION);
    if (!ctx) throw new Error('2D context unavailable - is the `canvas` package installed?');

    expect(() => {
      applyLashesEye({
        face,
        ctx,
        rgb: RGB,
        dimension: DIMENSION,
        alpha: ALPHA,
        pattern: 'NATURAL',
      });
    }).not.toThrow();
    expect(hasNonTransparentPixel(ctx)).toBe(false);
  });
});

// Dedicated geometry regressions - each of these pins a specific fix that, until now, was only
// ever confirmed by a one-off manual browser script (flood-fill scan, pixel-diff, etc.) during
// this finish's own original build, never as a committed automated test. See each finish's own
// tracker file (EYELINER.md/KAJAL.md/EYESHADOW.md/EYEBROW.md/MASCARA.md/LASHES.md) for the full
// history of the bug each of these locks down.

describe('EYELINER wing-gap regression', () => {
  // `buildTaperedRibbonPath`'s own comment: a single filled polygon that walks out-and-back along
  // an offset curve self-intersects wherever the path bends tighter than the offset width, which a
  // wing's own sharp launch off a real (non-symmetric) outer eye corner does - the fix was
  // switching to per-segment quads under the nonzero winding rule. On the realistic-corner fixture
  // above (the exact kind of bend a bilateral-symmetric spiral fixture can't reproduce), the wing
  // must still read as one connected shape, not two disconnected lobes with a gap between them.
  it.each(['WINGED_CAT_EYE', 'DOUBLE_WING'] as const)(
    '%s wing renders as a single connected shape per eye, not a disconnected fragment',
    (pattern) => {
      const face = makeRealisticEyeFace();
      const ctx = createOffscreenCtx(DIMENSION);
      if (!ctx) throw new Error('2D context unavailable - is the `canvas` package installed?');

      applyEyelinerEye({ face, ctx, rgb: RGB, dimension: DIMENSION, alpha: ALPHA, pattern });

      // Left eye only (x < 0.5 * width) - right eye's own wing is a mirrored, separate component
      // and would otherwise be double-counted as "more than one shape".
      const leftHalf = { x0: 0, y0: 0, x1: Math.floor(DIMENSION.width / 2), y1: DIMENSION.height };
      expect(countConnectedComponents(ctx, leftHalf)).toBe(1);
    },
  );
});

describe('KAJAL corner-fade-tail regression', () => {
  // `renderCornerFadeTail`'s own comment: a flat full-width cut exactly at the last traced
  // landmark used to read as "stops short of the corner" - the fix continues a soft taper a little
  // *past* the real corner. Full Bold Kohl (the widest KAJAL pattern) must paint a pixel just
  // beyond its own outer-corner landmark (133 at x=0.30 on this fixture), not stop exactly on it.
  it('Full Bold Kohl paints past its own outer-corner landmark, not stopping exactly on it', () => {
    const face = makeRealisticEyeFace();
    const ctx = createOffscreenCtx(DIMENSION);
    if (!ctx) throw new Error('2D context unavailable - is the `canvas` package installed?');

    applyKajalEye({
      face,
      ctx,
      rgb: RGB,
      dimension: DIMENSION,
      alpha: ALPHA,
      pattern: 'FULL_BOLD_KOHL',
    });

    // Outer corner landmark 133 sits at normalized x=0.30 on the fixture above - a flat cut
    // exactly there (the historical bug) would mean nothing left of that corner is ever painted;
    // the fade-tail fix continues a short taper past it, so the leftmost painted pixel (left eye
    // only, x < half the canvas) must sit strictly left of the corner itself.
    const cornerX = 0.3 * DIMENSION.width;
    const { data } = ctx.getImageData(0, 0, DIMENSION.width, DIMENSION.height);
    let minX = Number.POSITIVE_INFINITY;
    for (let y = 0; y < DIMENSION.height; y++) {
      for (let x = 0; x < DIMENSION.width / 2; x++) {
        if ((data[(y * DIMENSION.width + x) * 4 + 3] ?? 0) > 0) minX = Math.min(minX, x);
      }
    }
    expect(minX).toBeLessThan(cornerX);
  });
});

describe('EYESHADOW corner-coverage regression', () => {
  // EYESHADOW.md's own design notes: the crease wash used to fall short of the outer corner. Smokey
  // Eye (the widest band) must still paint right up to the outer-corner landmark (133/x=0.30), not
  // stop short of it.
  it('Smokey Eye wash reaches the outer eye corner, not stopping short of it', () => {
    const face = makeRealisticEyeFace();
    const ctx = createOffscreenCtx(DIMENSION);
    if (!ctx) throw new Error('2D context unavailable - is the `canvas` package installed?');

    applyEyeshadowEye({
      face,
      ctx,
      rgb: RGB,
      dimension: DIMENSION,
      alpha: ALPHA,
      pattern: 'SMOKEY_EYE',
    });

    const px = Math.round(0.3 * DIMENSION.width);
    const py = Math.round(0.46 * DIMENSION.height);
    const { data } = ctx.getImageData(px, py, 1, 1);
    expect(data[3] ?? 0).toBeGreaterThan(0);
  });
});

// EYESHADOW.md's own Architecture gap: the crease line (Cut Crease's own crisp stroke, drawn via
// `offsetPointsAlongNormals` over the eyelid band's own height curve) is a synthesized
// approximation - no dedicated MediaPipe landmark tracks it - and had never been stress-tested
// across different eye shapes, only the one realistic-but-fixed shape every other regression test
// above uses. `outwardNormalsAlongPath`'s own "parallel transport" fix (see its comment) was
// written to survive exactly this kind of variation, but that claim had never actually been
// exercised against more than one shape.
//
// Builds a synthetic left-eye upper/lower arc pair from a small set of shape parameters, rather
// than the fixed almond curve `makeRealisticEyeFace` hand-plots above - lets one generator sweep
// several genuinely different eye shapes (round vs narrow, neutral vs upturned/downturned vs a
// sharply hooded corner) instead of writing out full landmark tables per shape.
const makeParameterizedEyeFace = ({
  archAmplitude,
  outerCornerYOffset,
  cornerBend,
}: {
  // How tall the upper lid's own arch is, as a fraction of eye width - small for a narrow/monolid
  // eye, large for a big round eye.
  archAmplitude: number;
  // Shifts the outer (temporal) corner up (negative) or down (positive) relative to the inner
  // corner - an upturned eye's outer corner sits higher, a downturned/hooded one sits lower.
  outerCornerYOffset: number;
  // How sharply the last upper-arc point bends back down toward the corner, on top of the smooth
  // arch - 0 is a smooth continuation, larger values approximate a hooded/deep-set corner crease,
  // the same kind of tight bend `makeRealisticEyeFace`'s own comment cites as the one a symmetric
  // fixture can't reproduce.
  cornerBend: number;
}): NormalizedLandmark[] => {
  const face = makeFixtureFace();
  const set = (index: number, x: number, y: number) => {
    face[index] = { x, y, z: 0, visibility: 1 };
  };

  const innerX = 0.46;
  const outerX = 0.3;
  const baseY = 0.46;
  const upperIndices = [33, 246, 161, 160, 159, 158, 157, 173, 133];
  const lowerIndices = [155, 154, 153, 145, 144, 163]; // 133/33 corners shared with the upper arc

  upperIndices.forEach((index, i) => {
    const t = i / (upperIndices.length - 1);
    const x = innerX + (outerX - innerX) * t;
    const arch = archAmplitude * Math.sin(Math.PI * t);
    const cornerLift = outerCornerYOffset * t;
    // The bend only kicks in over the last quarter of the arc, same "sharp launch right at the
    // corner, not a gradual one" shape the realistic fixture's own hand-plotted points use.
    const bend = t > 0.75 ? cornerBend * ((t - 0.75) / 0.25) ** 2 : 0;
    set(index, x, baseY - arch + cornerLift + bend);
  });

  set(133, outerX, baseY + outerCornerYOffset); // outer corner, shared by both arcs
  set(33, innerX, baseY); // inner corner, shared by both arcs

  lowerIndices.forEach((index, i) => {
    const t = (i + 1) / (lowerIndices.length + 1);
    const x = outerX + (innerX - outerX) * t;
    const lowerArch = archAmplitude * 0.6 * Math.sin(Math.PI * t);
    const cornerLift = outerCornerYOffset * (1 - t);
    set(index, x, baseY + lowerArch * 0.5 + cornerLift * 0.3 + 0.02);
  });

  set(1, 0.5, baseY); // nose tip, between the two eyes at their shared inner-corner height

  // Right eye - a plain mirror of the left across x=0.5 (same shape parameters), so
  // `getOrderedEyeArcs`'s own right-side lookups resolve to a sane, symmetric eye too.
  const mirrorMap: Record<number, number> = {
    33: 362,
    246: 398,
    161: 384,
    160: 385,
    159: 386,
    158: 387,
    157: 388,
    173: 466,
    133: 263,
    155: 249,
    154: 390,
    153: 373,
    145: 374,
    144: 380,
    163: 381,
  };
  Object.entries(mirrorMap).forEach(([leftIndex, rightIndex]) => {
    const p = face[Number(leftIndex)];
    if (p) set(rightIndex, 1 - p.x, p.y);
  });
  // RIGHT_EYE_LOWER_INDICES has one extra point (382) LEFT_EYE_LOWER_INDICES doesn't - filled from
  // its own nearest neighbor (381) rather than left as spiral-filler noise.
  const p381 = face[381];
  if (p381) set(382, p381.x, p381.y);

  return face;
};

describe('EYESHADOW crease-line multi-eye-shape stress test', () => {
  const shapes: Record<string, Parameters<typeof makeParameterizedEyeFace>[0]> = {
    'narrow/monolid (low arch)': { archAmplitude: 0.02, outerCornerYOffset: 0, cornerBend: 0 },
    'round/wide (high arch)': { archAmplitude: 0.09, outerCornerYOffset: 0, cornerBend: 0 },
    upturned: { archAmplitude: 0.05, outerCornerYOffset: -0.04, cornerBend: 0 },
    'downturned/hooded (sharp corner)': {
      archAmplitude: 0.05,
      outerCornerYOffset: 0.03,
      cornerBend: 0.045,
    },
    'extreme hooded corner': { archAmplitude: 0.06, outerCornerYOffset: 0.02, cornerBend: 0.08 },
  };

  it.each(Object.entries(shapes))(
    'Cut Crease renders as one connected shape, not self-intersecting into fragments, on a %s eye',
    (_label, shapeParams) => {
      const face = makeParameterizedEyeFace(shapeParams);
      const ctx = createOffscreenCtx(DIMENSION);
      if (!ctx) throw new Error('2D context unavailable - is the `canvas` package installed?');

      applyEyeshadowEye({
        face,
        ctx,
        rgb: RGB,
        dimension: DIMENSION,
        alpha: ALPHA,
        pattern: 'CUT_CREASE',
      });

      expect(hasNonTransparentPixel(ctx)).toBe(true);
      const leftHalf = { x0: 0, y0: 0, x1: Math.floor(DIMENSION.width / 2), y1: DIMENSION.height };
      expect(countConnectedComponents(ctx, leftHalf)).toBe(1);
    },
  );
});

describe('EYEBROW tail-landmark regression', () => {
  // `LEFT_EYEBROW_INDICES`'s own comment: the raw 10-point MediaPipe ring sits visibly inside a
  // real brow's own tail hair - the fix appends one real extra landmark (156/383) that alone gives
  // the tail its correct extent. Bold/Defined Fill (a plain closed-region fill, no hair strokes)
  // must paint a pixel near that appended landmark (156 at x=0.30,y=0.46 on this fixture) - a point
  // the raw 10-point ring's own convex hull (every other point sits at x>=0.32) would never cover.
  const paintedPixelCount = (ctx: CanvasRenderingContext2D): number => {
    const { data } = ctx.getImageData(0, 0, DIMENSION.width, DIMENSION.height);
    let count = 0;
    for (let i = 3; i < data.length; i += 4) {
      if ((data[i] ?? 0) > 0) count++;
    }
    return count;
  };

  it('Bold/Defined Fill covers strictly more area with the tail landmark than without it', () => {
    const withTail = makeRealisticEyeFace();
    const ctxWithTail = createOffscreenCtx(DIMENSION);
    if (!ctxWithTail)
      throw new Error('2D context unavailable - is the `canvas` package installed?');
    applyEyebrowEye({
      face: withTail,
      ctx: ctxWithTail,
      rgb: RGB,
      dimension: DIMENSION,
      alpha: ALPHA,
      pattern: 'BOLD_DEFINED_FILL',
    });

    // Same fixture, but with the appended tail landmarks (156/383) collapsed onto their own ring's
    // last "real" point - i.e. the raw 10-point ring's own extent, with no tail extension at all.
    const withoutTail = makeRealisticEyeFace();
    const leftInner = withoutTail[46];
    const rightInner = withoutTail[276];
    if (leftInner) withoutTail[156] = { ...leftInner };
    if (rightInner) withoutTail[383] = { ...rightInner };
    const ctxWithoutTail = createOffscreenCtx(DIMENSION);
    if (!ctxWithoutTail)
      throw new Error('2D context unavailable - is the `canvas` package installed?');
    applyEyebrowEye({
      face: withoutTail,
      ctx: ctxWithoutTail,
      rgb: RGB,
      dimension: DIMENSION,
      alpha: ALPHA,
      pattern: 'BOLD_DEFINED_FILL',
    });

    expect(paintedPixelCount(ctxWithTail)).toBeGreaterThan(paintedPixelCount(ctxWithoutTail));
  });
});

// MASCARA's curl-direction claim (`rotateTowardUp`) and LASHES' own `lengthShape` claim
// (`lashLengthShapeMultiplier`) are both pure math with no canvas/pixel dependency - tested
// directly and deterministically in eye.test.ts instead of inferred from noisy aggregate pixel
// data here (many overlapping jittered strokes make a pixel-level version of these two claims
// fragile to calibrate and re-calibrate every time an unrelated tuning number changes).

// EYEBROW.md's own Architecture gap: `renderEyebrowHairStrokes`' own edge-pairing (`edgeA[i]`
// paired with `edgeB[i]` as "the same position along the brow") is a pure geometry claim, pulled
// out as `buildHairStrokeEdges` and tested directly in eye.test.ts instead of inferred from noisy
// aggregate pixel data here - densely-packed, jittered strokes naturally touch and merge into a
// few large connected regions even when every pairing is correct, so a pixel-level version of this
// claim can't actually distinguish correct behavior from a broken one.

// MASCARA.md's own Architecture gap: per-lash root-sampling (`renderLashStrokesForEye`'s own
// `sampleIndex = Math.round(t * (lashPts.length - 1))` against a densified upper-arc path) had
// never been stress-tested against narrower/wider eye shapes than the one realistic fixture every
// other regression test above uses - reuses `makeParameterizedEyeFace` (already built for
// EYESHADOW's own stress test) rather than a second generator. Measured as how much of the eye's
// own actual width the painted lashes span (left eye only) - degenerate root-sampling (every lash
// clustering near one end regardless of eye shape) would paint a narrow sliver instead of reaching
// close to both corners.
describe('MASCARA lash root-sampling multi-shape stress test', () => {
  const shapes: Record<string, Parameters<typeof makeParameterizedEyeFace>[0]> = {
    'narrow/monolid (low arch)': { archAmplitude: 0.02, outerCornerYOffset: 0, cornerBend: 0 },
    'round/wide (high arch)': { archAmplitude: 0.09, outerCornerYOffset: 0, cornerBend: 0 },
    upturned: { archAmplitude: 0.05, outerCornerYOffset: -0.04, cornerBend: 0 },
    'downturned/hooded (sharp corner)': {
      archAmplitude: 0.05,
      outerCornerYOffset: 0.03,
      cornerBend: 0.045,
    },
  };
  // `makeParameterizedEyeFace` always places the left eye's own inner/outer corners at x=0.46/0.3
  // regardless of shape (only the arch/corner-bend varies), so the expected eye width in canvas
  // pixels is the same fixed value across every shape in this suite.
  const eyeWidthPx = (0.46 - 0.3) * DIMENSION.width;

  it.each(Object.entries(shapes))(
    'Dramatic Length lashes spread across most of the lash line, not clustered at one end, on a %s eye',
    (_label, shapeParams) => {
      const face = makeParameterizedEyeFace(shapeParams);
      const ctx = createOffscreenCtx(DIMENSION);
      if (!ctx) throw new Error('2D context unavailable - is the `canvas` package installed?');

      applyMascaraEye({
        face,
        ctx,
        rgb: RGB,
        dimension: DIMENSION,
        alpha: ALPHA,
        pattern: 'DRAMATIC_LENGTH',
      });

      const { data } = ctx.getImageData(0, 0, DIMENSION.width, DIMENSION.height);
      let minX = Number.POSITIVE_INFINITY;
      let maxX = Number.NEGATIVE_INFINITY;
      for (let y = 0; y < DIMENSION.height; y++) {
        for (let x = 0; x < DIMENSION.width / 2; x++) {
          if ((data[(y * DIMENSION.width + x) * 4 + 3] ?? 0) > 0) {
            minX = Math.min(minX, x);
            maxX = Math.max(maxX, x);
          }
        }
      }
      expect(maxX - minX).toBeGreaterThan(eyeWidthPx * 0.8);
    },
  );
});
