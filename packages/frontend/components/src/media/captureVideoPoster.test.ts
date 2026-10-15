// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { captureVideoPoster, type ICapturePosterOptions } from './captureVideoPoster.js';

let drawn: [number, number][] = [];
let canvasSizes: [number, number][] = [];
let hasContext = true;
let dataUrl: () => string = () => 'data:image/jpeg;base64,AAA';

beforeEach(() => {
  drawn = [];
  canvasSizes = [];
  hasContext = true;
  dataUrl = () => 'data:image/jpeg;base64,AAA';

  // jsdom draws nothing: a canvas that remembers the size it was asked for and what was drawn on it
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(function (
    this: HTMLCanvasElement,
  ) {
    canvasSizes.push([this.width, this.height]);

    return hasContext
      ? ({
          drawImage: (_video: unknown, _x: number, _y: number, width: number, height: number) => {
            drawn.push([width, height]);
          },
        } as unknown as CanvasRenderingContext2D)
      : null;
  } as never);
  vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockImplementation(() => dataUrl());
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

/** Starts the work, and gives the video it made with a size and a `load` that can be asked about. */
const start = (
  src: string,
  options?: ICapturePosterOptions,
  size: { width: number; height: number } = { width: 1280, height: 720 },
) => {
  const create = vi.spyOn(document, 'createElement');
  const promise = captureVideoPoster(src, options);
  const video = create.mock.results
    .map((result) => result.value as unknown)
    .find((element): element is HTMLVideoElement => element instanceof HTMLVideoElement);

  create.mockRestore();

  if (!video) throw new Error('no video was made');

  Object.defineProperty(video, 'videoWidth', { configurable: true, get: () => size.width });
  Object.defineProperty(video, 'videoHeight', { configurable: true, get: () => size.height });
  const load = vi.spyOn(video, 'load').mockImplementation(() => undefined);

  return {
    promise,
    video,
    load,
    size,
    fire: (name: string) => {
      video.dispatchEvent(new Event(name));
    },
  };
};

describe('captureVideoPoster', () => {
  it('gives a picture of a frame of the video', async () => {
    const { promise, video, fire } = start('https://cdn.example/a.mp4');

    expect(video.getAttribute('src')).toBe('https://cdn.example/a.mp4');
    fire('loadeddata');
    fire('seeked');

    await expect(promise).resolves.toBe('data:image/jpeg;base64,AAA');
  });

  it('reads the video in the way it needs to be read for a picture, and silently', () => {
    const { video } = start('a.mp4');

    expect(video.muted).toBe(true);
    expect(video.playsInline).toBe(true);
    expect(video.preload).toBe('auto');
    expect(video.crossOrigin).toBe('anonymous');
  });

  it('moves to the moment asked for, but a little after the start when it is the start', () => {
    const timed = start('a.mp4', { time: 3 });
    const first = start('b.mp4');

    timed.fire('loadeddata');
    first.fire('loadeddata');

    expect(timed.video.currentTime).toBe(3);
    // a seek to where the video already is does not tell that it is done
    expect(first.video.currentTime).toBeGreaterThan(0);
    expect(first.video.currentTime).toBeLessThan(0.5);
  });

  it('waits for the frame: nothing is drawn before the video has moved', () => {
    const { fire } = start('a.mp4');

    fire('loadeddata');

    expect(drawn).toEqual([]);
  });

  it('makes a big frame smaller, keeping its shape, and leaves a small one as it is', async () => {
    const big = start('big.mp4', { maxWidth: 320 });
    const small = start('small.mp4', { maxWidth: 2000 });

    big.fire('seeked');
    small.fire('seeked');
    await Promise.all([big.promise, small.promise]);

    expect(drawn).toEqual([
      [320, 180],
      [1280, 720],
    ]);
    expect(canvasSizes).toEqual([
      [320, 180],
      [1280, 720],
    ]);
  });

  it('is 640 wide at most unless it is told another size', async () => {
    const { promise, fire } = start('a.mp4');

    fire('seeked');
    await promise;

    expect(drawn).toEqual([[640, 360]]);
  });

  it('lets the video go once it has the picture', async () => {
    const { promise, video, load, fire } = start('a.mp4');

    fire('seeked');
    await promise;

    expect(video.hasAttribute('src')).toBe(false);
    expect(load).toHaveBeenCalledTimes(1);
  });

  describe('gives nothing (and never rejects)', () => {
    it('when the video fails to load', async () => {
      const { promise, fire } = start('a.mp4');

      fire('error');

      await expect(promise).resolves.toBeUndefined();
    });

    it('when the video has no picture (its size is 0)', async () => {
      const { promise, fire } = start('a.mp4', undefined, { width: 0, height: 720 });

      fire('seeked');

      await expect(promise).resolves.toBeUndefined();
      expect(drawn).toEqual([]);
    });

    it('when the height is 0', async () => {
      const { promise, fire } = start('a.mp4', undefined, { width: 1280, height: 0 });

      fire('seeked');

      await expect(promise).resolves.toBeUndefined();
    });

    it('when the browser does not give a canvas to draw on', async () => {
      hasContext = false;
      const { promise, fire } = start('a.mp4');

      fire('seeked');

      await expect(promise).resolves.toBeUndefined();
    });

    it('when the canvas refuses to be read (a video from another site)', async () => {
      dataUrl = () => {
        throw new DOMException('tainted', 'SecurityError');
      };
      const { promise, fire } = start('a.mp4');

      fire('seeked');

      await expect(promise).resolves.toBeUndefined();
    });

    it('when it takes too long', async () => {
      vi.useFakeTimers();
      const { promise, load, fire } = start('a.mp4', { timeout: 500 });

      vi.advanceTimersByTime(499);
      fire('loadeddata');
      vi.advanceTimersByTime(1);

      await expect(promise).resolves.toBeUndefined();
      expect(load).toHaveBeenCalledTimes(1);
    });

    it('waits ten seconds unless it is told another time', async () => {
      vi.useFakeTimers();
      let settled = false;
      const { promise } = start('a.mp4');
      const watched = promise.then((poster) => {
        settled = true;

        return poster;
      });

      await vi.advanceTimersByTimeAsync(9999);
      expect(settled).toBe(false);

      await vi.advanceTimersByTimeAsync(1);
      await expect(watched).resolves.toBeUndefined();
    });
  });

  describe('when it is stopped', () => {
    it('gives nothing, and lets the video go', async () => {
      const controller = new AbortController();
      const { promise, load } = start('a.mp4', { signal: controller.signal });

      controller.abort();

      await expect(promise).resolves.toBeUndefined();
      expect(load).toHaveBeenCalledTimes(1);
    });

    it('does not even start when it was stopped before', async () => {
      const controller = new AbortController();
      const create = vi.spyOn(document, 'createElement');

      controller.abort();

      await expect(
        captureVideoPoster('a.mp4', { signal: controller.signal }),
      ).resolves.toBeUndefined();
      expect(create).not.toHaveBeenCalled();
    });

    it('ignores the stop that comes after the picture was made', async () => {
      const controller = new AbortController();
      const { promise, load, fire } = start('a.mp4', { signal: controller.signal });

      fire('seeked');
      controller.abort();

      await expect(promise).resolves.toBe('data:image/jpeg;base64,AAA');
      expect(load).toHaveBeenCalledTimes(1);
    });
  });

  it('asks the canvas for a jpeg of good quality', async () => {
    const { promise, fire } = start('a.mp4');
    const toDataURL = vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL');

    fire('seeked');
    await promise;

    expect(toDataURL).toHaveBeenCalledWith('image/jpeg', 0.8);
  });

  it('lets go of its timer once it is done', async () => {
    const clear = vi.spyOn(window, 'clearTimeout');
    const { promise, fire } = start('a.mp4');

    expect(clear).not.toHaveBeenCalled();

    fire('seeked');
    await promise;

    expect(clear).toHaveBeenCalledTimes(1);
  });

  it('gives one answer only, the first', async () => {
    const { promise, fire } = start('a.mp4');

    fire('error');
    fire('seeked');

    await expect(promise).resolves.toBeUndefined();
    expect(drawn).toEqual([]);
  });
});
