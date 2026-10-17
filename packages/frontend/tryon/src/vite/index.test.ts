// @vitest-environment node
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { tryOnVitePlugin } from './index.js';

const WRONG = '//# sourceMappingURL=vision_bundle_mjs.js.map';
const RIGHT = '//# sourceMappingURL=vision_bundle.mjs.map';

let folder: string;
let bundle: string;

// Vite gives the ids of files with forward slashes, on Windows too
const toId = (file: string) => file.replaceAll(path.sep, '/');

const load = (file: string): unknown => {
  const id = toId(file);
  const { load: hook } = tryOnVitePlugin();

  if (typeof hook !== 'function') throw new Error('the plugin has no load hook');

  return hook.call({} as never, id);
};

beforeAll(() => {
  folder = mkdtempSync(path.join(tmpdir(), 'tryon-vite-'));
  bundle = path.join(folder, 'node_modules', '@mediapipe', 'tasks-vision', 'vision_bundle.mjs');
  mkdirSync(path.dirname(bundle), { recursive: true });
  writeFileSync(bundle, `export const a = 1;\n${WRONG}\n`);
});

afterAll(() => {
  rmSync(folder, { recursive: true, force: true });
});

describe('tryOnVitePlugin', () => {
  it('has a name, so Vite can say which plugin did what', () => {
    expect(tryOnVitePlugin().name).toBe('beautinique-tryon');
  });

  it('keeps MediaPipe out of the pre-bundling: it loads its own WebAssembly', () => {
    const { config } = tryOnVitePlugin();

    if (typeof config !== 'function') throw new Error('the plugin has no config hook');

    expect(config.call({} as never, {}, { command: 'serve', mode: 'development' })).toEqual({
      optimizeDeps: { exclude: ['@mediapipe/tasks-vision'] },
    });
  });

  it('corrects the source map comment of the bundle of MediaPipe', () => {
    const code = load(bundle);

    expect(code).toBe(`export const a = 1;\n${RIGHT}\n`);
  });

  it('finds the bundle when Vite asks for it with a version in the query', () => {
    expect(load(`${bundle}?v=1a2b3c4d`)).toBe(`export const a = 1;\n${RIGHT}\n`);
  });

  it('leaves alone every other file (it returns null: Vite loads it itself)', () => {
    expect(load(path.join(folder, 'something.mjs'))).toBeNull();
    expect(load('/src/main.tsx')).toBeNull();
    // other files of the same package are not this one
    expect(
      load(path.join(folder, 'node_modules', '@mediapipe', 'tasks-vision', 'vision_bundle.cjs')),
    ).toBeNull();
  });

  it('gives a bundle that is right already as it is', () => {
    const right = path.join(folder, 'node_modules', '@mediapipe', 'tasks-vision-ok', 'x.mjs');

    mkdirSync(path.dirname(right), { recursive: true });
    writeFileSync(right, `export const b = 2;\n${RIGHT}\n`);

    // not the bundle by name: null. And the real one, fixed once, is not changed again.
    expect(load(right)).toBeNull();
    writeFileSync(bundle, `export const a = 1;\n${RIGHT}\n`);
    expect(load(bundle)).toBe(`export const a = 1;\n${RIGHT}\n`);
  });
});
