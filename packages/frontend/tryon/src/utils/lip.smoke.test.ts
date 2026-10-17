// @vitest-environment jsdom
//
// Every other test file in this project runs in the default `node` environment (see
// vite.config.ts) - these functions specifically need a real `document`/`HTMLCanvasElement`
// (several of them call `document.createElement('canvas')` internally for temp-canvas
// compositing, e.g. `applyMatteLips`, `applyLinerLips`, `applyTexturedLips`), which plain Node
// doesn't have. jsdom alone still wouldn't be enough - its own `HTMLCanvasElement.getContext`
// returns `null` unless the `canvas` package (real Cairo-backed 2D rendering, installed as a
// devDependency just for this file) is present, at which point jsdom auto-detects it and
// `getContext('2d')` returns a fully working context. Verified directly against both packages
// before writing this file.
//
// The side-effect import right below is *not* dead weight, even though nothing here calls
// anything from it directly - jsdom finds `canvas` via plain Node module resolution
// (`peerDependenciesMeta.canvas.optional` in its own package.json), not because anyone
// `require()`s it. Without an explicit reference somewhere, that makes it invisible to
// grep and to unused-dependency tooling (depcheck, knip, ...) alike - either could flag it
// "unused" and someone acts on that, silently breaking every test in this file. This import
// exists purely to keep `canvas` visibly, genuinely wired to real usage.
import 'canvas';

import type { NormalizedLandmark } from '@mediapipe/tasks-vision';
import { describe, expect, it } from 'vitest';

import { createOffscreenCtx } from './index.js';
import {
  applyBalmLips,
  applyCrayonLips,
  applyGlossLips,
  applyLinerLips,
  applyMatteLips,
  applyMetallicLips,
  applyOilLips,
  applyPlumperLips,
  applySatinLips,
  applyShimmerLips,
  applyStainLips,
} from './lip.js';

// MediaPipe FaceLandmarker's full mesh size - the highest index any of this file's constants
// reference (415, in UPPER_LIP_INDICES) comfortably fits, same as the real engine always gets.
const FACE_MESH_POINT_COUNT = 478;

// A deterministic, well-distributed fixture face - real anatomical lip positions don't matter
// for a smoke test (it only needs to confirm "doesn't throw, paints something"), just that
// *every* index any of these functions might read resolves to a valid, distinct, in-bounds
// (0-1) point. A sunflower-seed spiral guarantees that with no two points coinciding, which a
// naive fixed grid could accidentally do at some indices.
const makeFixtureFace = (): NormalizedLandmark[] => {
  const goldenAngle = Math.PI * (3 - Math.sqrt(5));
  return Array.from({ length: FACE_MESH_POINT_COUNT }, (_, i) => {
    const radius = 0.3 * Math.sqrt(i / FACE_MESH_POINT_COUNT);
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
const COLOR = 'rgba(200, 50, 80, 0.6)';
const ALPHA = 0.6;

const makeCtx = (): CanvasRenderingContext2D => {
  const ctx = createOffscreenCtx(DIMENSION);
  if (!ctx) throw new Error('2D context unavailable - is the `canvas` package installed?');
  return ctx;
};

// A small solid-fill canvas, standing in for a texture asset - every `applyXLips` call here
// only ever passes it straight into `ctx.drawImage()`, which accepts any `CanvasImageSource`
// (an `HTMLCanvasElement` included) at runtime, so the cast to the narrower `HTMLImageElement`
// parameter type these functions declare is safe. Building this beats loading a real image
// file, which would need an async decode step these synchronous smoke tests don't want.
const makeFixtureTexture = (): HTMLImageElement => {
  const ctx = createOffscreenCtx({ width: 8, height: 8 });
  if (!ctx) throw new Error('2D context unavailable for the fixture texture');
  ctx.fillStyle = 'white';
  ctx.fillRect(0, 0, 8, 8);
  return ctx.canvas as unknown as HTMLImageElement;
};

// Counts non-transparent pixels in the canvas's alpha channel - confirms each finish actually
// painted *something* onto the lips, not just "ran without throwing" (an accidental early
// `return` - e.g. a landmark-index typo making `face[index]` always `undefined` - would still
// pass a throw-only check while silently rendering nothing).
const hasNonTransparentPixel = (ctx: CanvasRenderingContext2D): boolean => {
  const { data } = ctx.getImageData(0, 0, DIMENSION.width, DIMENSION.height);
  for (let i = 3; i < data.length; i += 4) {
    if ((data[i] ?? 0) > 0) return true;
  }
  return false;
};

const face = makeFixtureFace();

// One row per finish - texture-based ones get a fixture texture, the 3 texture-free ones
// (MATTE lives in the util test's non-smoke file already; STAIN/LINER are covered here since
// they're texture-free too) don't.
const base = { face, color: COLOR, dimension: DIMENSION, alpha: ALPHA };

const cases: [
  name: string,
  run: (ctx: CanvasRenderingContext2D, texture: HTMLImageElement) => void,
][] = [
  [
    'applyMatteLips',
    (ctx) => {
      applyMatteLips({ ...base, ctx });
    },
  ],
  [
    'applyStainLips',
    (ctx) => {
      applyStainLips({ ...base, ctx });
    },
  ],
  [
    'applyLinerLips',
    (ctx) => {
      applyLinerLips({ ...base, ctx });
    },
  ],
  [
    'applySatinLips',
    (ctx, texture) => {
      applySatinLips({ ...base, ctx, textureUpper: texture, textureLower: texture });
    },
  ],
  [
    'applyGlossLips',
    (ctx, texture) => {
      applyGlossLips({ ...base, ctx, textureUpper: texture, textureLower: texture });
    },
  ],
  [
    'applyBalmLips',
    (ctx, texture) => {
      applyBalmLips({ ...base, ctx, textureUpper: texture, textureLower: texture });
    },
  ],
  [
    'applyShimmerLips',
    (ctx, texture) => {
      applyShimmerLips({ ...base, ctx, texture });
    },
  ],
  [
    'applyCrayonLips',
    (ctx, texture) => {
      applyCrayonLips({ ...base, ctx, texture });
    },
  ],
  [
    'applyOilLips',
    (ctx, texture) => {
      applyOilLips({ ...base, ctx, textureUpper: texture, textureLower: texture });
    },
  ],
  [
    'applyMetallicLips',
    (ctx, texture) => {
      applyMetallicLips({ ...base, ctx, textureUpper: texture, textureLower: texture });
    },
  ],
  [
    'applyPlumperLips',
    (ctx, texture) => {
      applyPlumperLips({ ...base, ctx, textureUpper: texture, textureLower: texture });
    },
  ],
];

describe('applyXLips smoke tests', () => {
  it.each(cases)('%s renders without throwing and paints at least one pixel', (_, run) => {
    const ctx = makeCtx();
    const texture = makeFixtureTexture();

    expect(() => {
      run(ctx, texture);
    }).not.toThrow();
    expect(hasNonTransparentPixel(ctx)).toBe(true);
  });
});
