// @vitest-environment node
import { describe, expect, it } from 'vitest';

import * as constants from './constants/index.js';
import * as root from './index.js';
import * as modal from './modal/index.js';
import * as vite from './vite/index.js';

// What the package gives to the apps, per import path. Nothing else may be reachable: an internal
// helper that leaks becomes a promise to keep it.
const CONSTANTS = [
  'DEFAULT_MEDIAPIPE_WASM_BASE_URL',
  'DEFAULT_TRYON_ASSETS_BASE_URL',
  'MEDIAPIPE_TASKS_VISION_VERSION',
  'TRYON_ASSETS_PACKAGE',
  'TRYON_ASSETS_VERSION',
  'TRYON_CATEGORY_OPTIONS',
  'TRYON_MODEL_IMAGES_FACE',
  'TRYON_MODEL_IMAGES_HAIR',
  'TRYON_MODEL_IMAGES_HAND',
  'TRYON_MODEL_PATHS',
  'TRYON_MODES',
  'TRYON_MODE_MAP',
  'TRYON_MODE_OPTIONS',
  'getTryOnInstructions',
  'getTryOnShades',
  'resolveTryOnAssetUrl',
  'resolveTryOnWasmBaseUrl',
];

const names = (module: object) => Object.keys(module).sort();

describe('the public API', () => {
  it('of /constants is the data a form needs, and the address helpers', () => {
    expect(names(constants)).toEqual(CONSTANTS);
  });

  it('of /modal is the modal', () => {
    expect(names(modal)).toEqual(['TryOnModal']);
  });

  it('of /vite is the plugin', () => {
    expect(names(vite)).toEqual(['tryOnVitePlugin']);
  });

  it('of the root is the constants and the modal that loads itself', () => {
    expect(names(root)).toEqual([...CONSTANTS, 'TryOnModal'].sort());
  });

  it('has the same constants in the root and in /constants (one value, not two copies)', () => {
    for (const name of CONSTANTS) {
      expect(root[name as keyof typeof root], name).toBe(constants[name as keyof typeof constants]);
    }
  });

  it('has a modal in the root that is not the one of /modal: it loads that one when it is opened', () => {
    expect(root.TryOnModal).not.toBe(modal.TryOnModal);
    expect(root.TryOnModal).toBeTypeOf('function');
    expect(modal.TryOnModal).toBeTypeOf('function');
  });
});
