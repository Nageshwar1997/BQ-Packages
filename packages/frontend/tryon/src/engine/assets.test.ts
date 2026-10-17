// @vitest-environment jsdom
import { TRY_ON_CATEGORY_MAP } from '@beautinique/frontend-constants';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  DEFAULT_MEDIAPIPE_WASM_BASE_URL,
  DEFAULT_TRYON_ASSETS_BASE_URL,
  TRYON_MODEL_PATHS,
} from '../constants/assets.js';
import type { ITryOnAssets } from '../types/assets.js';
import type * as Utils from '../utils/index.js';
import { EyeUploadEngine } from './categories/eye/index.js';
import { FaceUploadEngine } from './categories/face/index.js';
import { HairUploadEngine } from './categories/hair/index.js';
import { LipUploadEngine } from './categories/lip/index.js';
import { NailUploadEngine } from './categories/nail/index.js';

/*
 * MediaPipe is replaced: nothing is downloaded, and what the engines ask of it is recorded. What these
 * tests look at is where the engines say their files are (the WebAssembly, the model, the textures):
 * it has to be what `assets` says, for every category.
 */
const mediapipe = vi.hoisted(() => {
  const created: { kind: string; options: { baseOptions: { modelAssetPath: string } } }[] = [];
  const make = (kind: string) =>
    vi.fn((_vision: unknown, options: { baseOptions: { modelAssetPath: string } }) => {
      created.push({ kind, options });

      return Promise.resolve({ close: () => undefined });
    });

  return {
    created,
    forVisionTasks: vi.fn((base: string) => Promise.resolve({ base })),
    face: make('face'),
    hand: make('hand'),
    hair: make('hair'),
  };
});

vi.mock('@mediapipe/tasks-vision', () => ({
  FilesetResolver: { forVisionTasks: mediapipe.forVisionTasks },
  FaceLandmarker: { createFromOptions: mediapipe.face },
  HandLandmarker: { createFromOptions: mediapipe.hand },
  ImageSegmenter: { createFromOptions: mediapipe.hair },
}));

const loadedImages = vi.hoisted(() => [] as string[]);

vi.mock('../utils/index.js', async (importOriginal) => ({
  ...(await importOriginal<typeof Utils>()),
  loadImage: vi.fn((src: string) => {
    loadedImages.push(src);

    return Promise.resolve(document.createElement('img'));
  }),
}));

type TEngine = new (
  canvas1: HTMLCanvasElement,
  canvas2: HTMLCanvasElement,
  initialState?: object,
  options?: { assets?: ITryOnAssets },
) => {
  startTryOn: () => Promise<void>;
  destroy: () => void;
  getState: () => { error?: unknown; tryOnStarted: boolean };
};

const CATEGORIES: [string, TEngine, keyof typeof TRYON_MODEL_PATHS][] = [
  [TRY_ON_CATEGORY_MAP.LIP, LipUploadEngine, 'face'],
  [TRY_ON_CATEGORY_MAP.FACE, FaceUploadEngine, 'face'],
  [TRY_ON_CATEGORY_MAP.EYE, EyeUploadEngine, 'face'],
  [TRY_ON_CATEGORY_MAP.HAIR, HairUploadEngine, 'hair'],
  [TRY_ON_CATEGORY_MAP.NAIL, NailUploadEngine, 'hand'],
];

// Every case uses an address of its own: the models are cached for the page by address (and must be
// made again for another address), so no case can be satisfied by the model of the one before.
let unique = 0;
const freshAssets = (): ITryOnAssets => {
  unique += 1;

  return { baseUrl: `/files-${String(unique)}/`, wasmBaseUrl: `/wasm-${String(unique)}` };
};

const start = async (Engine: TEngine, assets?: ITryOnAssets) => {
  const engine = new Engine(
    document.createElement('canvas'),
    document.createElement('canvas'),
    {},
    assets ? { assets } : undefined,
  );

  await engine.startTryOn();

  return engine;
};

describe('where an engine says its files are', () => {
  beforeEach(() => {
    mediapipe.created.length = 0;
    mediapipe.forVisionTasks.mockClear();
    loadedImages.length = 0;
  });

  describe.each(CATEGORIES)('the %s engine', (_category, Engine, model) => {
    it('loads the model and the WebAssembly from the places `assets` says', async () => {
      const assets = freshAssets();
      const engine = await start(Engine, assets);

      expect(mediapipe.forVisionTasks).toHaveBeenCalledWith(assets.wasmBaseUrl?.replace(/\/$/, ''));
      expect(mediapipe.created).toHaveLength(1);
      expect(mediapipe.created[0]?.options.baseOptions.modelAssetPath).toBe(
        `${assets.baseUrl ?? ''}${TRYON_MODEL_PATHS[model]}`,
      );
      expect(engine.getState().error).toBeUndefined();
      expect(engine.getState().tryOnStarted).toBe(true);

      engine.destroy();
    });

    it('asks the right model of MediaPipe for its category', async () => {
      const engine = await start(Engine, freshAssets());

      expect(mediapipe.created.map(({ kind }) => kind)).toEqual([
        model === 'face' ? 'face' : model,
      ]);

      engine.destroy();
    });

    it('takes the places of `resolve` when it is given', async () => {
      const assets: ITryOnAssets = {
        ...freshAssets(),
        resolve: (path) => `https://hashed.example.com/${path.replaceAll('/', '_')}`,
      };
      const engine = await start(Engine, assets);

      expect(mediapipe.created[0]?.options.baseOptions.modelAssetPath).toBe(
        `https://hashed.example.com/${TRYON_MODEL_PATHS[model].replaceAll('/', '_')}`,
      );

      engine.destroy();
    });
  });

  it('uses the CDN for the model and for the WebAssembly when it is told nothing', async () => {
    // the one engine that is made without `assets`: it must be the first to ask for this address
    const engine = await start(FaceUploadEngine);

    expect(mediapipe.forVisionTasks).toHaveBeenCalledWith(DEFAULT_MEDIAPIPE_WASM_BASE_URL);
    expect(mediapipe.created[0]?.options.baseOptions.modelAssetPath).toBe(
      `${DEFAULT_TRYON_ASSETS_BASE_URL}models/face_landmarker.task`,
    );

    engine.destroy();
  });

  it('makes a model once for an address, however many engines ask for it', async () => {
    const assets = freshAssets();
    const first = await start(FaceUploadEngine, assets);
    const second = await start(EyeUploadEngine, assets);

    // the lip, face and eye engines follow the same face: one landmarker
    expect(mediapipe.face).toHaveBeenCalledTimes(1);

    first.destroy();
    second.destroy();
  });

  describe('the lip textures', () => {
    it('are loaded from the folder of the images of `assets`, all eight of them', async () => {
      const assets = freshAssets();
      const engine = await start(LipUploadEngine, assets);

      expect(loadedImages).toHaveLength(8);
      for (const src of loadedImages) {
        expect(src.startsWith(`${assets.baseUrl ?? ''}images/lips/textures/`), src).toBe(true);
      }

      engine.destroy();
    });

    it('are loaded from the CDN when `assets` says nothing', async () => {
      const engine = await start(LipUploadEngine, {});

      for (const src of loadedImages) {
        expect(src.startsWith(`${DEFAULT_TRYON_ASSETS_BASE_URL}images/lips/textures/`), src).toBe(
          true,
        );
      }

      engine.destroy();
    });
  });
});
