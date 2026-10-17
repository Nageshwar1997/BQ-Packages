// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';

import {
  DEFAULT_MEDIAPIPE_WASM_BASE_URL,
  DEFAULT_TRYON_ASSETS_BASE_URL,
} from '../constants/assets.js';
import type { ITryOnModelUrls } from '../types/assets.js';
import { createSharedModelCache } from './index.js';

const canvas = () => document.createElement('canvas');

const setup = () => {
  const createModel = vi.fn(
    (_canvas: HTMLCanvasElement, mode: string | undefined, urls: ITryOnModelUrls) =>
      Promise.resolve({ mode, urls }),
  );

  return { createModel, get: createSharedModelCache('models/face_landmarker.task', createModel) };
};

describe('createSharedModelCache', () => {
  it('makes the model from the addresses of the files: the CDN unless it was told another place', async () => {
    const { get, createModel } = setup();

    const model = await get(canvas(), 'IMAGE');

    expect(model.urls).toEqual({
      modelUrl: `${DEFAULT_TRYON_ASSETS_BASE_URL}models/face_landmarker.task`,
      wasmBaseUrl: DEFAULT_MEDIAPIPE_WASM_BASE_URL,
    });
    expect(createModel).toHaveBeenCalledTimes(1);

    const own = await get(canvas(), 'IMAGE', { baseUrl: '/files/', wasmBaseUrl: '/wasm/' });

    expect(own.urls).toEqual({
      modelUrl: '/files/models/face_landmarker.task',
      wasmBaseUrl: '/wasm',
    });
  });

  it('makes it once, and gives the same one to every caller that asks the same thing', async () => {
    const { get, createModel } = setup();

    const [first, second] = await Promise.all([get(canvas(), 'VIDEO'), get(canvas(), 'VIDEO')]);
    const third = await get(canvas(), 'VIDEO');

    expect(first).toBe(second);
    expect(third).toBe(first);
    expect(createModel).toHaveBeenCalledTimes(1);
  });

  it('keeps one for each running mode: MediaPipe binds a model to the mode it was made for', async () => {
    const { get, createModel } = setup();

    const video = await get(canvas(), 'VIDEO');
    const image = await get(canvas(), 'IMAGE');

    expect(video).not.toBe(image);
    expect(video.mode).toBe('VIDEO');
    expect(image.mode).toBe('IMAGE');
    expect(createModel).toHaveBeenCalledTimes(2);
  });

  it('keeps one for each address of the files: a model from one place is not given to a caller that asked for another', async () => {
    const { get, createModel } = setup();

    const cdn = await get(canvas(), 'IMAGE');
    const same = await get(canvas(), 'IMAGE', {});
    const local = await get(canvas(), 'IMAGE', { baseUrl: '/files/' });
    const hashed = await get(canvas(), 'IMAGE', { resolve: (path) => `/h/${path}` });
    const elsewhereWasm = await get(canvas(), 'IMAGE', { wasmBaseUrl: '/wasm' });

    expect(same).toBe(cdn); // `{}` is the same as nothing
    expect(new Set([cdn, local, hashed, elsewhereWasm]).size).toBe(4);
    expect(hashed.urls.modelUrl).toBe('/h/models/face_landmarker.task');
    expect(createModel).toHaveBeenCalledTimes(4);
  });

  it('forgets a model that could not be made, so the next caller tries again', async () => {
    const createModel = vi
      .fn<
        (c: HTMLCanvasElement, mode: string | undefined, urls: ITryOnModelUrls) => Promise<string>
      >()
      .mockRejectedValueOnce(new Error('the network is down'))
      .mockResolvedValueOnce('the model');
    const get = createSharedModelCache('models/x.task', createModel);

    await expect(get(canvas(), 'IMAGE')).rejects.toThrow('the network is down');
    await expect(get(canvas(), 'IMAGE')).resolves.toBe('the model');
    expect(createModel).toHaveBeenCalledTimes(2);
  });

  it('does not even start for a caller that has already given up', async () => {
    const { get, createModel } = setup();
    const controller = new AbortController();

    controller.abort();

    await expect(get(canvas(), 'IMAGE', undefined, controller.signal)).rejects.toMatchObject({
      name: 'AbortError',
    });
    expect(createModel).not.toHaveBeenCalled();
  });

  it('lets a caller give up while it waits, and keeps making the model for the others', async () => {
    let finish: (model: string) => void = () => undefined;
    const createModel = vi.fn(
      () =>
        new Promise<string>((resolve) => {
          finish = resolve;
        }),
    );
    const get = createSharedModelCache('models/x.task', createModel);
    const controller = new AbortController();

    const gaveUp = get(canvas(), 'IMAGE', undefined, controller.signal);
    const other = get(canvas(), 'IMAGE');

    controller.abort();
    await expect(gaveUp).rejects.toMatchObject({ name: 'AbortError' });

    // the creation was not cancelled by it: the other caller gets the model, and nothing is made twice
    finish('the model');
    await expect(other).resolves.toBe('the model');
    expect(createModel).toHaveBeenCalledTimes(1);
  });

  it('gives a caller with a signal the model when it is not aborted', async () => {
    const { get } = setup();
    const controller = new AbortController();

    const model = await get(canvas(), 'IMAGE', undefined, controller.signal);

    expect(model.mode).toBe('IMAGE');
  });
});
