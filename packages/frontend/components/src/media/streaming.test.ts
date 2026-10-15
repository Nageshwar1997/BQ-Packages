// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { attachStream, isHlsSource } from './streaming.js';

type THandler = (event: string, data?: unknown) => void;

const hls = vi.hoisted(() => ({
  instances: [] as {
    handlers: Map<string, THandler>;
    loadSource: ReturnType<typeof vi.fn>;
    attachMedia: ReturnType<typeof vi.fn>;
    destroy: ReturnType<typeof vi.fn>;
    startLoad: ReturnType<typeof vi.fn>;
    recoverMediaError: ReturnType<typeof vi.fn>;
    emit: (event: string, data?: unknown) => void;
  }[],
  isSupported: true,
}));

vi.mock('hls.js', () => {
  class FakeHls {
    static Events = { MANIFEST_PARSED: 'manifestParsed', ERROR: 'error' };
    static ErrorTypes = { NETWORK_ERROR: 'networkError', MEDIA_ERROR: 'mediaError' };
    static isSupported = () => hls.isSupported;

    handlers = new Map<string, THandler>();
    loadSource = vi.fn();
    attachMedia = vi.fn();
    destroy = vi.fn();
    startLoad = vi.fn();
    recoverMediaError = vi.fn();

    constructor() {
      hls.instances.push(this);
    }

    on(event: string, handler: THandler) {
      this.handlers.set(event, handler);
    }

    emit(event: string, data?: unknown) {
      this.handlers.get(event)?.(event, data);
    }
  }

  return { default: FakeHls };
});

const makeVideo = (canPlay: '' | 'maybe' = '') => {
  const video = document.createElement('video');
  const play = vi.fn(() => Promise.resolve());

  video.canPlayType = vi.fn(() => canPlay);
  video.play = play;

  return Object.assign(video, { playMock: play });
};

const stream = async () => {
  await vi.waitFor(() => {
    expect(hls.instances).toHaveLength(1);
  });

  const instance = hls.instances.at(0);

  if (!instance) throw new Error('no player');

  return instance;
};

describe('isHlsSource', () => {
  it.each([
    ['https://cdn.example/video/master.m3u8', true],
    ['https://cdn.example/video/master.M3U8', true],
    ['/video/master.m3u8?token=abc', true],
    ['/video/master.m3u8#t=3', true],
    ['https://cdn.example/video/clip.mp4', false],
    ['https://cdn.example/m3u8/clip.mp4', false],
    ['clip.m3u8.mp4', false],
    ['', false],
  ])('says %s is HLS: %s', (src, expected) => {
    expect(isHlsSource(src)).toBe(expected);
  });
});

describe('attachStream', () => {
  beforeEach(() => {
    hls.instances.length = 0;
    hls.isSupported = true;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('in a browser that plays HLS itself (Safari, iOS)', () => {
    it('gives the playlist to the video, and does not load hls.js', async () => {
      const video = makeVideo('maybe');

      attachStream(video, 'https://cdn.example/a.m3u8', { autoPlay: true });
      await Promise.resolve();

      expect(video.src).toBe('https://cdn.example/a.m3u8');
      expect(hls.instances).toHaveLength(0);
    });

    it('plays when the video knows what it is, if it is told to play by itself', () => {
      const video = makeVideo('maybe');

      attachStream(video, 'a.m3u8', { autoPlay: true });
      expect(video.playMock).not.toHaveBeenCalled();

      video.dispatchEvent(new Event('loadedmetadata'));
      video.dispatchEvent(new Event('loadedmetadata'));

      expect(video.playMock).toHaveBeenCalledTimes(1);
    });

    it('does not play by itself when it is not told to', () => {
      const video = makeVideo('maybe');

      attachStream(video, 'a.m3u8', { autoPlay: false });
      video.dispatchEvent(new Event('loadedmetadata'));

      expect(video.playMock).not.toHaveBeenCalled();
    });

    it('stops waiting for the video when it is stopped', () => {
      const video = makeVideo('maybe');
      const stop = attachStream(video, 'a.m3u8', { autoPlay: true });

      stop();
      video.dispatchEvent(new Event('loadedmetadata'));

      expect(video.playMock).not.toHaveBeenCalled();
    });

    it('does not mind a browser that refuses to play by itself', async () => {
      const video = makeVideo('maybe');
      const onError = vi.fn();

      video.play = vi.fn(() => Promise.reject(new DOMException('blocked', 'NotAllowedError')));
      attachStream(video, 'a.m3u8', { autoPlay: true, onError });
      video.dispatchEvent(new Event('loadedmetadata'));
      await Promise.resolve();

      expect(onError).not.toHaveBeenCalled();
    });
  });

  describe('in a browser that needs hls.js', () => {
    it('loads the playlist with it, into the video', async () => {
      const video = makeVideo();

      attachStream(video, 'https://cdn.example/a.m3u8', { autoPlay: true });
      const player = await stream();

      expect(player.loadSource).toHaveBeenCalledWith('https://cdn.example/a.m3u8');
      expect(player.attachMedia).toHaveBeenCalledWith(video);
      expect(video.getAttribute('src')).toBeNull();
    });

    it('plays when the playlist is read, if it is told to play by itself', async () => {
      const video = makeVideo();

      attachStream(video, 'a.m3u8', { autoPlay: true });
      (await stream()).emit('manifestParsed');

      expect(video.playMock).toHaveBeenCalledTimes(1);
    });

    it('does not play by itself when it is not told to', async () => {
      const video = makeVideo();

      attachStream(video, 'a.m3u8', { autoPlay: false });
      (await stream()).emit('manifestParsed');

      expect(video.playMock).not.toHaveBeenCalled();
    });

    it('says so when the browser cannot play it at all', async () => {
      hls.isSupported = false;
      const onError = vi.fn();

      attachStream(makeVideo(), 'a.m3u8', { autoPlay: true, onError });
      await vi.waitFor(() => {
        expect(onError).toHaveBeenCalledTimes(1);
      });

      expect(onError.mock.calls[0]?.[0]).toBeInstanceOf(Error);
      expect(hls.instances).toHaveLength(0);
    });

    it('does not need an onError', async () => {
      hls.isSupported = false;

      expect(() => {
        attachStream(makeVideo(), 'a.m3u8', { autoPlay: true });
      }).not.toThrow();
      await Promise.resolve();
    });

    describe('when something goes wrong', () => {
      const fatal = (type: string) => ({ fatal: true, type });

      it('ignores an error that is not fatal', async () => {
        const onError = vi.fn();

        attachStream(makeVideo(), 'a.m3u8', { autoPlay: true, onError });
        const player = await stream();

        player.emit('error', { fatal: false, type: 'networkError' });

        expect(onError).not.toHaveBeenCalled();
        expect(player.startLoad).not.toHaveBeenCalled();
        expect(player.destroy).not.toHaveBeenCalled();
      });

      it('loads again after a fatal network error', async () => {
        const onError = vi.fn();

        attachStream(makeVideo(), 'a.m3u8', { autoPlay: true, onError });
        const player = await stream();

        player.emit('error', fatal('networkError'));

        expect(player.startLoad).toHaveBeenCalledTimes(1);
        expect(player.destroy).not.toHaveBeenCalled();
        expect(onError).not.toHaveBeenCalled();
      });

      it('recovers after a fatal media error', async () => {
        attachStream(makeVideo(), 'a.m3u8', { autoPlay: true });
        const player = await stream();

        player.emit('error', fatal('mediaError'));

        expect(player.recoverMediaError).toHaveBeenCalledTimes(1);
        expect(player.destroy).not.toHaveBeenCalled();
      });

      it('gives up after three tries, and says it', async () => {
        const onError = vi.fn();

        attachStream(makeVideo(), 'a.m3u8', { autoPlay: true, onError });
        const player = await stream();

        for (let attempt = 0; attempt < 3; attempt += 1)
          player.emit('error', fatal('networkError'));
        expect(player.startLoad).toHaveBeenCalledTimes(3);
        expect(onError).not.toHaveBeenCalled();

        const last = fatal('networkError');

        player.emit('error', last);

        expect(player.startLoad).toHaveBeenCalledTimes(3);
        expect(player.destroy).toHaveBeenCalledTimes(1);
        expect(onError).toHaveBeenCalledWith(last);
      });

      it('counts the network and the media errors together', async () => {
        const onError = vi.fn();

        attachStream(makeVideo(), 'a.m3u8', { autoPlay: true, onError });
        const player = await stream();

        player.emit('error', fatal('networkError'));
        player.emit('error', fatal('mediaError'));
        player.emit('error', fatal('networkError'));
        player.emit('error', fatal('mediaError'));

        expect(player.destroy).toHaveBeenCalledTimes(1);
        expect(onError).toHaveBeenCalledTimes(1);
      });

      it('gives up at once on any other fatal error', async () => {
        const onError = vi.fn();

        attachStream(makeVideo(), 'a.m3u8', { autoPlay: true, onError });
        const player = await stream();
        const other = fatal('otherError');

        player.emit('error', other);

        expect(player.startLoad).not.toHaveBeenCalled();
        expect(player.recoverMediaError).not.toHaveBeenCalled();
        expect(player.destroy).toHaveBeenCalledTimes(1);
        expect(onError).toHaveBeenCalledWith(other);
      });

      it('does not destroy the player a second time when it is stopped after it gave up', async () => {
        const stop = attachStream(makeVideo(), 'a.m3u8', { autoPlay: true });
        const player = await stream();

        player.emit('error', fatal('otherError'));
        stop();

        expect(player.destroy).toHaveBeenCalledTimes(1);
      });
    });

    describe('when it is stopped', () => {
      it('destroys the player', async () => {
        const stop = attachStream(makeVideo(), 'a.m3u8', { autoPlay: true });
        const player = await stream();

        stop();

        expect(player.destroy).toHaveBeenCalledTimes(1);
      });

      it('does not make a player at all when it is stopped before hls.js arrives', async () => {
        const onError = vi.fn();
        const stop = attachStream(makeVideo(), 'a.m3u8', { autoPlay: true, onError });

        stop();
        await new Promise((resolve) => setTimeout(resolve, 0));

        expect(hls.instances).toHaveLength(0);
        expect(onError).not.toHaveBeenCalled();
      });

      it('does not say that the browser cannot play it, if it was stopped', async () => {
        hls.isSupported = false;
        const onError = vi.fn();
        const stop = attachStream(makeVideo(), 'a.m3u8', { autoPlay: true, onError });

        stop();
        await new Promise((resolve) => setTimeout(resolve, 0));

        expect(onError).not.toHaveBeenCalled();
      });
    });
  });

  describe('when hls.js is not installed or cannot be loaded', () => {
    afterEach(() => {
      vi.doUnmock('hls.js');
      vi.resetModules();
    });

    it('says it through onError, and does not throw', async () => {
      vi.resetModules();
      vi.doMock('hls.js', () => {
        throw new Error('Cannot find module hls.js');
      });
      const fresh = await import('./streaming.js');
      const onError = vi.fn();

      fresh.attachStream(makeVideo(), 'a.m3u8', { autoPlay: true, onError });
      await vi.waitFor(() => {
        expect(onError).toHaveBeenCalledTimes(1);
      });

      expect(onError.mock.calls[0]?.[0]).toBeInstanceOf(Error);
    });

    it('says nothing if it was stopped meanwhile', async () => {
      vi.resetModules();
      vi.doMock('hls.js', () => {
        throw new Error('Cannot find module hls.js');
      });
      const fresh = await import('./streaming.js');
      const onError = vi.fn();
      const stop = fresh.attachStream(makeVideo(), 'a.m3u8', { autoPlay: true, onError });

      stop();
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(onError).not.toHaveBeenCalled();
    });
  });
});
