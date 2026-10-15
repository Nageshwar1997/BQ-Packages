// @vitest-environment jsdom
import { createRef } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { required } from '../test-utils/dom.js';
import { mount, unmountAll } from '../test-utils/react.js';
import { VideoPlayer } from './VideoPlayer.js';

const mocks = vi.hoisted(() => ({
  attachStream: vi.fn(),
  captureVideoPoster: vi.fn(),
}));

vi.mock('./streaming.js', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./streaming.js')>()),
  attachStream: mocks.attachStream,
}));
vi.mock('./captureVideoPoster.js', () => ({ captureVideoPoster: mocks.captureVideoPoster }));

const videoOf = (container: HTMLElement) => required(container.querySelector('video'), 'the video');
const imageOf = (container: HTMLElement) => required(container.querySelector('img'), 'the poster');

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('VideoPlayer', () => {
  let stop: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    stop = vi.fn();
    mocks.attachStream.mockReset().mockReturnValue(stop);
    mocks.captureVideoPoster.mockReset().mockResolvedValue('data:image/jpeg;base64,GENERATED');
  });

  afterEach(unmountAll);

  describe('the video', () => {
    it('plays by itself, muted and inline, without controls and without a loop, unless told otherwise', () => {
      const view = mount(<VideoPlayer videoProps={{ src: 'https://cdn.example/a.mp4' }} />);
      const video = videoOf(view.container);

      expect(video.getAttribute('src')).toBe('https://cdn.example/a.mp4');
      expect(video.autoplay).toBe(true);
      expect(video.muted).toBe(true);
      expect(video.playsInline).toBe(true);
      expect(video.loop).toBe(false);
      expect(video.controls).toBe(false);
    });

    it('takes what it is told instead', () => {
      const view = mount(
        <VideoPlayer
          videoProps={{
            src: 'a.mp4',
            autoPlay: false,
            muted: false,
            playsInline: false,
            loop: true,
            controls: true,
          }}
        />,
      );
      const video = videoOf(view.container);

      expect(video.autoplay).toBe(false);
      expect(video.muted).toBe(false);
      expect(video.playsInline).toBe(false);
      expect(video.loop).toBe(true);
      expect(video.controls).toBe(true);
    });

    it('gives the other attributes of the video to it', () => {
      const view = mount(
        <VideoPlayer
          videoProps={{ src: 'a.mp4', 'aria-label': 'Product video', preload: 'none', id: 'v' }}
        />,
      );
      const video = videoOf(view.container);

      expect(video.getAttribute('aria-label')).toBe('Product video');
      expect(video.getAttribute('preload')).toBe('none');
      expect(video.id).toBe('v');
    });

    it('puts its class on the box and the class of the video on the video', () => {
      const view = mount(
        <VideoPlayer className="box" videoProps={{ src: 'a.mp4', className: 'clip' }} />,
      );
      const video = videoOf(view.container);

      expect(required(view.container.firstElementChild, 'the box').className).toBe(
        'h-full w-full box',
      );
      expect(video.className).toContain('clip');
      expect(video.className).toContain('object-cover');
      expect(video.className).not.toContain('box');
    });

    it('gives the poster it is given to the video', () => {
      const view = mount(<VideoPlayer videoProps={{ src: 'a.mp4', poster: 'p.webp' }} />);

      expect(videoOf(view.container).getAttribute('poster')).toBe('p.webp');
    });

    it('does not make a poster when the video plays: the video shows its own first frame', async () => {
      const getPoster = vi.fn();

      mount(<VideoPlayer videoProps={{ src: 'a.mp4' }} getPoster={getPoster} />);
      await flush();

      expect(getPoster).not.toHaveBeenCalled();
      expect(mocks.captureVideoPoster).not.toHaveBeenCalled();
    });

    it('is a new video when the source changes', () => {
      const view = mount(<VideoPlayer videoProps={{ src: 'a.mp4' }} />);
      const before = videoOf(view.container);

      view.rerender(<VideoPlayer videoProps={{ src: 'b.mp4' }} />);

      expect(videoOf(view.container)).not.toBe(before);
      expect(videoOf(view.container).getAttribute('src')).toBe('b.mp4');
    });

    it('is the same video when something else changes', () => {
      const view = mount(<VideoPlayer videoProps={{ src: 'a.mp4' }} />);
      const before = videoOf(view.container);

      view.rerender(<VideoPlayer videoProps={{ src: 'a.mp4', loop: true }} className="x" />);

      expect(videoOf(view.container)).toBe(before);
    });

    it('has no source when it is given none', () => {
      const view = mount(<VideoPlayer videoProps={{}} />);

      expect(videoOf(view.container).hasAttribute('src')).toBe(false);
      expect(mocks.attachStream).not.toHaveBeenCalled();
    });
  });

  describe('the ref', () => {
    it('is the video, and null once it is removed', () => {
      const ref = createRef<HTMLVideoElement>();
      const view = mount(<VideoPlayer ref={ref} videoProps={{ src: 'a.mp4' }} />);

      expect(ref.current).toBe(videoOf(view.container));

      view.unmount();

      expect(ref.current).toBeNull();
    });

    it('can be a function', () => {
      const received: (HTMLVideoElement | null)[] = [];
      const view = mount(
        <VideoPlayer
          ref={(node) => {
            received.push(node);
          }}
          videoProps={{ src: 'a.mp4' }}
        />,
      );

      expect(received).toContain(videoOf(view.container));
    });

    it('is not set while only the poster is shown', () => {
      const ref = createRef<HTMLVideoElement>();

      mount(
        <VideoPlayer ref={ref} showPosterOnly videoProps={{ src: 'a.mp4', poster: 'p.webp' }} />,
      );

      expect(ref.current).toBeNull();
    });
  });

  describe('a stream (.m3u8)', () => {
    const SRC = 'https://cdn.example/master.m3u8';

    it('is given to the video by the player, not as the src: a browser would fail on it', () => {
      const view = mount(<VideoPlayer videoProps={{ src: SRC }} />);
      const video = videoOf(view.container);

      expect(video.hasAttribute('src')).toBe(false);
      expect(mocks.attachStream).toHaveBeenCalledTimes(1);
      expect(mocks.attachStream.mock.calls[0]?.[0]).toBe(video);
      expect(mocks.attachStream.mock.calls[0]?.[1]).toBe(SRC);
    });

    it('is told to play by itself, unless the video is told not to', () => {
      mount(<VideoPlayer videoProps={{ src: SRC }} />);
      mount(<VideoPlayer videoProps={{ src: SRC, autoPlay: false }} />);

      expect(mocks.attachStream.mock.calls[0]?.[2]).toMatchObject({ autoPlay: true });
      expect(mocks.attachStream.mock.calls[1]?.[2]).toMatchObject({ autoPlay: false });
    });

    it('stops when it is removed', () => {
      const view = mount(<VideoPlayer videoProps={{ src: SRC }} />);

      expect(stop).not.toHaveBeenCalled();

      view.unmount();

      expect(stop).toHaveBeenCalledTimes(1);
    });

    it('starts again for another source, after stopping the one before', () => {
      const view = mount(<VideoPlayer videoProps={{ src: SRC }} />);

      view.rerender(<VideoPlayer videoProps={{ src: 'https://cdn.example/other.m3u8' }} />);

      expect(stop).toHaveBeenCalledTimes(1);
      expect(mocks.attachStream).toHaveBeenCalledTimes(2);
      expect(mocks.attachStream.mock.calls[1]?.[1]).toBe('https://cdn.example/other.m3u8');
    });

    it('stops when the source is no longer a stream', () => {
      const view = mount(<VideoPlayer videoProps={{ src: SRC }} />);

      view.rerender(<VideoPlayer videoProps={{ src: 'a.mp4' }} />);

      expect(stop).toHaveBeenCalledTimes(1);
      expect(mocks.attachStream).toHaveBeenCalledTimes(1);
    });

    it('is a plain source for anything else', () => {
      mount(<VideoPlayer videoProps={{ src: 'a.mp4' }} />);

      expect(mocks.attachStream).not.toHaveBeenCalled();
    });

    it('tells the app when it cannot be played, with the newest function it gave', () => {
      const first = vi.fn();
      const second = vi.fn();
      const view = mount(<VideoPlayer videoProps={{ src: SRC }} onStreamError={first} />);

      view.rerender(<VideoPlayer videoProps={{ src: SRC }} onStreamError={second} />);
      const options = mocks.attachStream.mock.calls[0]?.[2] as {
        onError: (error: unknown) => void;
      };
      const failure = new Error('fatal');

      options.onError(failure);

      expect(first).not.toHaveBeenCalled();
      expect(second).toHaveBeenCalledWith(failure);
    });

    it('does not start again when only the function for errors changes', () => {
      const view = mount(<VideoPlayer videoProps={{ src: SRC }} onStreamError={vi.fn()} />);

      view.rerender(<VideoPlayer videoProps={{ src: SRC }} onStreamError={vi.fn()} />);

      expect(mocks.attachStream).toHaveBeenCalledTimes(1);
      expect(stop).not.toHaveBeenCalled();
    });

    it('does not mind an error when the app does not listen', () => {
      mount(<VideoPlayer videoProps={{ src: SRC }} />);
      const options = mocks.attachStream.mock.calls[0]?.[2] as {
        onError: (error: unknown) => void;
      };

      expect(() => {
        options.onError(new Error('x'));
      }).not.toThrow();
    });

    it('is left running once in StrictMode', () => {
      const view = mount(<VideoPlayer videoProps={{ src: SRC }} />, { strict: true });

      // started, stopped, started: one is running
      expect(mocks.attachStream.mock.calls.length - stop.mock.calls.length).toBe(1);

      view.unmount();

      expect(stop.mock.calls.length).toBe(mocks.attachStream.mock.calls.length);
    });

    it('is not started while only the poster is shown', () => {
      mount(<VideoPlayer showPosterOnly videoProps={{ src: SRC, poster: 'p.webp' }} />);

      expect(mocks.attachStream).not.toHaveBeenCalled();
    });

    it('is started when the poster is no longer all that is shown', () => {
      const view = mount(
        <VideoPlayer showPosterOnly videoProps={{ src: SRC, poster: 'p.webp' }} />,
      );

      view.rerender(<VideoPlayer videoProps={{ src: SRC, poster: 'p.webp' }} />);

      expect(mocks.attachStream).toHaveBeenCalledTimes(1);
    });
  });

  describe('only the poster', () => {
    it('is a picture, not a video, that fills its box', () => {
      const view = mount(
        <VideoPlayer
          showPosterOnly
          className="box"
          videoProps={{ src: 'a.mp4', poster: 'p.webp', className: 'cover' }}
        />,
      );
      const image = imageOf(view.container);

      expect(view.container.querySelector('video')).toBeNull();
      expect(image.getAttribute('src')).toBe('p.webp');
      expect(image.className).toContain('cover');
      expect(image.className).toContain('object-cover');
      expect(required(view.container.firstElementChild, 'the box').className).toContain('box');
    });

    it('has no words for a screen reader unless it is given some: it is usually inside a button that has its own name', () => {
      const plain = mount(<VideoPlayer showPosterOnly videoProps={{ poster: 'p.webp' }} />);
      const named = mount(
        <VideoPlayer
          showPosterOnly
          posterAlt="Cover of the video"
          videoProps={{ poster: 'p.webp' }}
        />,
      );

      expect(imageOf(plain.container).getAttribute('alt')).toBe('');
      expect(imageOf(named.container).getAttribute('alt')).toBe('Cover of the video');
    });

    describe('while there is no poster', () => {
      it('shows a picture of its own', () => {
        const view = mount(<VideoPlayer showPosterOnly videoProps={{}} />);

        expect(imageOf(view.container).getAttribute('src')).toMatch(/^data:image\/svg\+xml,/);
      });

      it('shows the one the app gives', () => {
        const view = mount(
          <VideoPlayer showPosterOnly placeholder="/placeholder.webp" videoProps={{}} />,
        );

        expect(imageOf(view.container).getAttribute('src')).toBe('/placeholder.webp');
      });
    });

    describe('made from the video', () => {
      it('is a frame of the file, taken in the browser', async () => {
        const view = mount(
          <VideoPlayer showPosterOnly videoProps={{ src: 'https://cdn.example/a.mp4' }} />,
        );

        // the picture of its own, until the frame is there
        expect(imageOf(view.container).getAttribute('src')).toMatch(/^data:image\/svg\+xml,/);
        await vi.waitFor(() => {
          expect(imageOf(view.container).getAttribute('src')).toBe(
            'data:image/jpeg;base64,GENERATED',
          );
        });

        expect(mocks.captureVideoPoster.mock.calls[0]?.[0]).toBe('https://cdn.example/a.mp4');
        expect(mocks.captureVideoPoster.mock.calls[0]?.[1]).toMatchObject({
          signal: expect.any(AbortSignal) as AbortSignal,
        });
      });

      it('is not made for a stream: a frame cannot be read from one', async () => {
        const view = mount(
          <VideoPlayer showPosterOnly videoProps={{ src: 'https://cdn.example/a.m3u8' }} />,
        );

        await flush();

        expect(mocks.captureVideoPoster).not.toHaveBeenCalled();
        expect(imageOf(view.container).getAttribute('src')).toMatch(/^data:image\/svg\+xml,/);
      });

      it('is not made when a poster is given, or when there is no source', async () => {
        mount(<VideoPlayer showPosterOnly videoProps={{ src: 'a.mp4', poster: 'p.webp' }} />);
        mount(<VideoPlayer showPosterOnly videoProps={{}} />);
        await flush();

        expect(mocks.captureVideoPoster).not.toHaveBeenCalled();
      });

      it('stays the placeholder when no frame could be taken', async () => {
        mocks.captureVideoPoster.mockResolvedValue(undefined);
        const view = mount(<VideoPlayer showPosterOnly videoProps={{ src: 'a.mp4' }} />);

        await flush();

        expect(imageOf(view.container).getAttribute('src')).toMatch(/^data:image\/svg\+xml,/);
      });

      it('is made once for a source, not at every render', async () => {
        const view = mount(<VideoPlayer showPosterOnly videoProps={{ src: 'a.mp4' }} />);

        await flush();
        view.rerender(<VideoPlayer showPosterOnly className="x" videoProps={{ src: 'a.mp4' }} />);
        await flush();

        expect(mocks.captureVideoPoster).toHaveBeenCalledTimes(1);
      });

      it('is made again for another source, and the old one is not shown for the new', async () => {
        const view = mount(<VideoPlayer showPosterOnly videoProps={{ src: 'a.mp4' }} />);

        await vi.waitFor(() => {
          expect(imageOf(view.container).getAttribute('src')).toBe(
            'data:image/jpeg;base64,GENERATED',
          );
        });
        mocks.captureVideoPoster.mockReturnValue(new Promise(() => undefined));
        view.rerender(<VideoPlayer showPosterOnly videoProps={{ src: 'b.mp4' }} />);

        expect(imageOf(view.container).getAttribute('src')).toMatch(/^data:image\/svg\+xml,/);
        expect(mocks.captureVideoPoster).toHaveBeenCalledTimes(2);
      });

      it('is stopped when the video is removed, and a late answer changes nothing', async () => {
        let resolve: (value: string) => void = () => undefined;

        mocks.captureVideoPoster.mockReturnValue(
          new Promise<string>((done) => {
            resolve = done;
          }),
        );
        const view = mount(<VideoPlayer showPosterOnly videoProps={{ src: 'a.mp4' }} />);
        const signal = (mocks.captureVideoPoster.mock.calls[0]?.[1] as { signal: AbortSignal })
          .signal;

        expect(signal.aborted).toBe(false);

        view.unmount();

        expect(signal.aborted).toBe(true);
        expect(() => {
          resolve('late');
        }).not.toThrow();
        await flush();
      });

      it('does not let a late answer for the old source take the place of the new one', async () => {
        const answers = new Map<string, (value: string) => void>();

        mocks.captureVideoPoster.mockImplementation(
          (src: string) =>
            new Promise<string>((resolve) => {
              answers.set(src, resolve);
            }),
        );
        const view = mount(<VideoPlayer showPosterOnly videoProps={{ src: 'a.mp4' }} />);

        view.rerender(<VideoPlayer showPosterOnly videoProps={{ src: 'b.mp4' }} />);
        answers.get('b.mp4')?.('data:image/jpeg;base64,B');
        await vi.waitFor(() => {
          expect(imageOf(view.container).getAttribute('src')).toBe('data:image/jpeg;base64,B');
        });

        answers.get('a.mp4')?.('data:image/jpeg;base64,A');
        await flush();

        expect(imageOf(view.container).getAttribute('src')).toBe('data:image/jpeg;base64,B');
      });

      it('is stopped when the source changes', () => {
        const view = mount(<VideoPlayer showPosterOnly videoProps={{ src: 'a.mp4' }} />);
        const signal = (mocks.captureVideoPoster.mock.calls[0]?.[1] as { signal: AbortSignal })
          .signal;

        view.rerender(<VideoPlayer showPosterOnly videoProps={{ src: 'b.mp4' }} />);

        expect(signal.aborted).toBe(true);
      });
    });

    describe('made by the app (getPoster)', () => {
      it('is asked for with the source and a signal that stops the work', async () => {
        const getPoster = vi.fn().mockResolvedValue('https://cdn.example/poster.webp');
        const view = mount(
          <VideoPlayer showPosterOnly getPoster={getPoster} videoProps={{ src: 'a.mp4' }} />,
        );

        await vi.waitFor(() => {
          expect(imageOf(view.container).getAttribute('src')).toBe(
            'https://cdn.example/poster.webp',
          );
        });

        expect(getPoster).toHaveBeenCalledWith('a.mp4', expect.any(AbortSignal));
        expect(mocks.captureVideoPoster).not.toHaveBeenCalled();
      });

      it('can answer at once, without a promise', async () => {
        const view = mount(
          <VideoPlayer
            showPosterOnly
            getPoster={(src) => `${src}.poster.webp`}
            videoProps={{ src: 'a.mp4' }}
          />,
        );

        await vi.waitFor(() => {
          expect(imageOf(view.container).getAttribute('src')).toBe('a.mp4.poster.webp');
        });
      });

      it('is asked for a stream too: the app may know how to', async () => {
        const getPoster = vi.fn().mockResolvedValue('s.webp');

        mount(<VideoPlayer showPosterOnly getPoster={getPoster} videoProps={{ src: 'a.m3u8' }} />);
        await flush();

        expect(getPoster).toHaveBeenCalledWith('a.m3u8', expect.any(AbortSignal));
      });

      it('leaves the placeholder when it has none to give', async () => {
        const view = mount(
          <VideoPlayer showPosterOnly getPoster={() => undefined} videoProps={{ src: 'a.mp4' }} />,
        );

        await flush();

        expect(imageOf(view.container).getAttribute('src')).toMatch(/^data:image\/svg\+xml,/);
      });

      it('leaves the placeholder when it fails, and does not let the error out', async () => {
        const unhandled = vi.fn();

        process.on('unhandledRejection', unhandled);
        const view = mount(
          <VideoPlayer
            showPosterOnly
            getPoster={() => Promise.reject(new Error('no poster service'))}
            videoProps={{ src: 'a.mp4' }}
          />,
        );

        await flush();
        process.off('unhandledRejection', unhandled);

        expect(unhandled).not.toHaveBeenCalled();
        expect(imageOf(view.container).getAttribute('src')).toMatch(/^data:image\/svg\+xml,/);
      });

      it('uses the newest function it was given, without asking again', async () => {
        const first = vi.fn().mockResolvedValue('first.webp');
        const second = vi.fn().mockResolvedValue('second.webp');
        const view = mount(
          <VideoPlayer showPosterOnly getPoster={first} videoProps={{ src: 'a.mp4' }} />,
        );

        await flush();
        view.rerender(
          <VideoPlayer showPosterOnly getPoster={second} videoProps={{ src: 'a.mp4' }} />,
        );
        await flush();

        expect(first).toHaveBeenCalledTimes(1);
        expect(second).not.toHaveBeenCalled();

        view.rerender(
          <VideoPlayer showPosterOnly getPoster={second} videoProps={{ src: 'b.mp4' }} />,
        );
        await flush();

        expect(second).toHaveBeenCalledTimes(1);
      });
    });
  });

  // These lines are checked by the type check of the package (`npm run typecheck`), not by vitest.
  it('does not compile without videoProps, or with a poster that is not a picture address', () => {
    const check = () => {
      // @ts-expect-error the attributes of the video are needed
      <VideoPlayer />;
      // @ts-expect-error showPosterOnly is true or false
      <VideoPlayer videoProps={{}} showPosterOnly="yes" />;
      // @ts-expect-error the function that makes a poster gets a source
      <VideoPlayer videoProps={{}} getPoster={(src: number) => String(src)} />;
    };

    expect(check).toBeTypeOf('function');
  });
});
