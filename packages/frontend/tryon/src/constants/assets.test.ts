// @vitest-environment node
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import {
  DEFAULT_MEDIAPIPE_WASM_BASE_URL,
  DEFAULT_TRYON_ASSETS_BASE_URL,
  MEDIAPIPE_TASKS_VISION_VERSION,
  resolveTryOnAssetUrl,
  resolveTryOnWasmBaseUrl,
  TRYON_ASSETS_PACKAGE,
  TRYON_ASSETS_VERSION,
  TRYON_MODEL_PATHS,
} from './assets.js';
import { EYE_PATTERNS } from './eye.js';
import {
  TRYON_MODEL_IMAGES_FACE,
  TRYON_MODEL_IMAGES_HAIR,
  TRYON_MODEL_IMAGES_HAND,
} from './index.js';
import * as lip from './lip.js';

const readJson = (url: URL) => JSON.parse(readFileSync(url, 'utf8')) as Record<string, unknown>;

const PACKAGE_URL = new URL('../../package.json', import.meta.url);
const ASSETS_URL = new URL('../../../tryon-assets/', import.meta.url);

/** Every file of the assets package, as the path the try-on uses for it (`images/eye/kajal/Bold.webp`). */
const filesOfAssetsPackage = (): string[] => {
  const root = fileURLToPath(ASSETS_URL);
  const walk = (folder: string): string[] =>
    readdirSync(folder).flatMap((name) => {
      const full = `${folder}/${name}`;

      return statSync(full).isDirectory() ? walk(full) : [full];
    });

  return ['models', 'images']
    .flatMap((folder) => walk(`${root}${folder}`))
    .map((file) => file.slice(root.length));
};

describe('resolveTryOnAssetUrl', () => {
  it('uses the CDN, in the version the try-on was tested with, when it is told nothing', () => {
    expect(resolveTryOnAssetUrl('models/face_landmarker.task')).toBe(
      `https://cdn.jsdelivr.net/npm/${TRYON_ASSETS_PACKAGE}@${TRYON_ASSETS_VERSION}/models/face_landmarker.task`,
    );
    expect(resolveTryOnAssetUrl('images/eye/kajal/Bold.webp', {})).toBe(
      `${DEFAULT_TRYON_ASSETS_BASE_URL}images/eye/kajal/Bold.webp`,
    );
  });

  it('puts the path after the base url, with or without its closing slash', () => {
    expect(resolveTryOnAssetUrl('images/a.webp', { baseUrl: '/tryon-assets/' })).toBe(
      '/tryon-assets/images/a.webp',
    );
    expect(resolveTryOnAssetUrl('images/a.webp', { baseUrl: '/tryon-assets' })).toBe(
      '/tryon-assets/images/a.webp',
    );
    expect(resolveTryOnAssetUrl('images/a.webp', { baseUrl: 'https://cdn.example.com/x//' })).toBe(
      'https://cdn.example.com/x//images/a.webp',
    );
  });

  it('does not double the slash when the path starts with one', () => {
    expect(resolveTryOnAssetUrl('/images/a.webp', { baseUrl: '/t/' })).toBe('/t/images/a.webp');
  });

  it('asks `resolve` first, with the path inside the assets package, when it is given', () => {
    const resolve = (path: string) => `https://hashed.example.com/${path.replaceAll('/', '_')}`;

    expect(resolveTryOnAssetUrl('images/a.webp', { resolve, baseUrl: '/ignored/' })).toBe(
      'https://hashed.example.com/images_a.webp',
    );
  });
});

describe('resolveTryOnWasmBaseUrl', () => {
  it('is the folder of the same version of MediaPipe in the CDN by default, without a closing slash', () => {
    expect(resolveTryOnWasmBaseUrl()).toBe(
      `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MEDIAPIPE_TASKS_VISION_VERSION}/wasm`,
    );
    expect(resolveTryOnWasmBaseUrl()).toBe(DEFAULT_MEDIAPIPE_WASM_BASE_URL);
    expect(DEFAULT_MEDIAPIPE_WASM_BASE_URL.endsWith('/')).toBe(false);
  });

  it('takes the folder it is given, without its closing slash', () => {
    expect(resolveTryOnWasmBaseUrl({ wasmBaseUrl: '/wasm/' })).toBe('/wasm');
    expect(resolveTryOnWasmBaseUrl({ wasmBaseUrl: '/wasm' })).toBe('/wasm');
  });

  it('is not changed by the base url of the other files', () => {
    expect(resolveTryOnWasmBaseUrl({ baseUrl: '/tryon-assets/' })).toBe(
      DEFAULT_MEDIAPIPE_WASM_BASE_URL,
    );
  });
});

describe('the versions', () => {
  it('say the version of the assets package of this monorepo', () => {
    const assetsPackage = readJson(new URL('package.json', ASSETS_URL));

    expect(assetsPackage.name).toBe(TRYON_ASSETS_PACKAGE);
    expect(assetsPackage.version).toBe(TRYON_ASSETS_VERSION);
  });

  it('say the version of the dependency, which is exact, and the one that is installed', () => {
    const own = readJson(PACKAGE_URL) as { dependencies: Record<string, string> };
    const installed = readJson(
      new URL('../../../../../node_modules/@mediapipe/tasks-vision/package.json', import.meta.url),
    );

    // exact: a range would let the JavaScript move away from the WebAssembly of the CDN
    expect(own.dependencies['@mediapipe/tasks-vision']).toBe(MEDIAPIPE_TASKS_VISION_VERSION);
    expect(installed.version).toBe(MEDIAPIPE_TASKS_VISION_VERSION);
  });

  it('are in the dev dependency on the assets package, so the monorepo tests what it publishes', () => {
    const own = readJson(PACKAGE_URL) as { devDependencies: Record<string, string> };

    expect(own.devDependencies[TRYON_ASSETS_PACKAGE]).toBe(`^${TRYON_ASSETS_VERSION}`);
  });
});

describe('the files of the assets package', () => {
  const lipTextures = Object.values(lip).filter(
    (value): value is string => typeof value === 'string' && value.startsWith('images/lips/'),
  );

  const referenced = new Set<string>([
    ...Object.values(TRYON_MODEL_PATHS),
    ...TRYON_MODEL_IMAGES_FACE,
    ...TRYON_MODEL_IMAGES_HAIR,
    ...TRYON_MODEL_IMAGES_HAND,
    ...Object.values(EYE_PATTERNS).flatMap((patterns) => patterns.map((pattern) => pattern.image)),
    ...lipTextures,
  ]);

  it('are all of them used by the try-on (nothing is published for nothing)', () => {
    const unused = filesOfAssetsPackage().filter((file) => !referenced.has(file));

    expect(unused).toEqual([]);
  });

  it('exist for every path the constants name (nothing is a broken address)', () => {
    const present = new Set(filesOfAssetsPackage());
    const missing = [...referenced].filter((path) => !present.has(path));

    expect(missing).toEqual([]);
  });

  it('are found: the lists the test builds are not empty', () => {
    expect(lipTextures.length).toBeGreaterThan(0);
    expect(referenced.size).toBeGreaterThan(50);
  });
});
