// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { click, installResizeObserver, required, setScrollMetrics } from '../test-utils/dom.js';
import { mount, unmountAll } from '../test-utils/react.js';
import type { TMediaOption } from './labels.js';
import { MediaCarousel } from './MediaCarousel.js';

const players = vi.hoisted(() => ({ calls: [] as Record<string, unknown>[] }));

vi.mock('./VideoPlayer.js', () => ({
  VideoPlayer: (props: { videoProps: { src?: string }; showPosterOnly?: boolean }) => {
    players.calls.push({ ...props });

    return (
      <div
        data-testid="player"
        data-src={props.videoProps.src}
        data-poster-only={String(props.showPosterOnly === true)}
      />
    );
  },
}));

const IMAGES: TMediaOption[] = [
  { type: 'image', url: '/a.webp' },
  { type: 'image', url: '/b.webp' },
  { type: 'image', url: '/c.webp' },
];
const MIXED: TMediaOption[] = [
  { type: 'image', url: '/a.webp' },
  { type: 'video', url: '/v.mp4' },
  { type: 'image', url: '/c.webp' },
];

const thumbButtons = (container: HTMLElement) => [
  ...container.querySelectorAll<HTMLButtonElement>('li > button:first-child'),
];
const items = (container: HTMLElement) => [...container.querySelectorAll('li')];
const scrollerOf = (container: HTMLElement) =>
  required(container.querySelector<HTMLElement>('[class*="overflow-x-auto"]'), 'the scroller');

let observers: ReturnType<typeof installResizeObserver>;

describe('MediaCarousel', () => {
  beforeEach(() => {
    observers = installResizeObserver();
    players.calls.length = 0;
  });

  afterEach(() => {
    unmountAll();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('draws nothing without media', () => {
    const view = mount(<MediaCarousel media={[]} onClick={vi.fn()} />);

    expect(view.container.innerHTML).toBe('');
  });

  describe('the thumbnails', () => {
    it('are a list, with a button for each, named by what it shows', () => {
      const view = mount(<MediaCarousel media={MIXED} onClick={vi.fn()} />);

      expect(view.container.querySelector('ul')).not.toBeNull();
      expect(items(view.container)).toHaveLength(3);
      expect(
        thumbButtons(view.container).map((button) => button.getAttribute('aria-label')),
      ).toEqual(['Show image 1 of 3', 'Show video 2 of 3', 'Show image 3 of 3']);
    });

    it('tell which one is chosen, to assistive technology and to the eyes', () => {
      const view = mount(<MediaCarousel media={IMAGES} selected={1} onClick={vi.fn()} />);
      const buttons = thumbButtons(view.container);
      const rows = items(view.container);

      expect(buttons.map((button) => button.getAttribute('aria-current'))).toEqual([
        null,
        'true',
        null,
      ]);
      expect(rows[1]?.className).toContain('border-tertiary');
      expect(rows[0]?.className).toContain('border-primary/30');
    });

    it('have none chosen without selected, or with null', () => {
      const without = mount(<MediaCarousel media={IMAGES} onClick={vi.fn()} />);
      const none = mount(<MediaCarousel media={IMAGES} selected={null} onClick={vi.fn()} />);

      for (const view of [without, none]) {
        expect(
          thumbButtons(view.container).every((button) => !button.hasAttribute('aria-current')),
        ).toBe(true);
      }
    });

    it('can be chosen: the button tells which one', () => {
      const onClick = vi.fn();
      const view = mount(<MediaCarousel media={IMAGES} onClick={onClick} />);

      click(required(thumbButtons(view.container)[2], 'the third'));

      expect(onClick).toHaveBeenCalledTimes(1);
      expect(onClick).toHaveBeenCalledWith(2);
    });

    it('show an image as a picture with no words (the button has the name), loaded when it is near', () => {
      const view = mount(<MediaCarousel media={IMAGES} onClick={vi.fn()} />);
      const image = required(view.container.querySelector('img'), 'the picture');

      expect(image.getAttribute('src')).toBe('/a.webp');
      expect(image.getAttribute('alt')).toBe('');
      expect(image.getAttribute('loading')).toBe('lazy');
      expect(image.getAttribute('draggable')).toBe('false');
    });

    it('show a video as its poster, with a play mark that is not read out', () => {
      const view = mount(<MediaCarousel media={MIXED} selected={0} onClick={vi.fn()} />);
      const player = required(view.container.querySelector('[data-testid="player"]'), 'the player');
      const mark = required(
        view.container.querySelector('li:nth-child(2) [aria-hidden="true"]'),
        'the play mark',
      );

      expect(player.getAttribute('data-poster-only')).toBe('true');
      expect(player.getAttribute('data-src')).toBe('/v.mp4');
      expect(mark.querySelector('svg')).not.toBeNull();
      expect(players.calls[0]).toMatchObject({ videoProps: { src: '/v.mp4', autoPlay: false } });
    });

    it('have no play mark on the video that is chosen', () => {
      const view = mount(<MediaCarousel media={MIXED} selected={1} onClick={vi.fn()} />);

      expect(view.container.querySelector('li:nth-child(2) [aria-hidden="true"]')).toBeNull();
    });

    it('give the player what the app asked for the posters', () => {
      const getPoster = vi.fn();
      const view = mount(
        <MediaCarousel
          media={MIXED}
          onClick={vi.fn()}
          playerProps={{ getPoster, placeholder: '/p.webp' }}
        />,
      );

      expect(view.container.querySelector('[data-testid="player"]')).not.toBeNull();
      expect(players.calls[0]).toMatchObject({ getPoster, placeholder: '/p.webp' });
    });

    it('can be named in the language of the app', () => {
      const view = mount(
        <MediaCarousel
          media={MIXED}
          onClick={vi.fn()}
          labels={{ select: (item, index) => `Ver ${item.type} ${String(index + 1)}` }}
        />,
      );

      expect(
        thumbButtons(view.container).map((button) => button.getAttribute('aria-label')),
      ).toEqual(['Ver image 1', 'Ver video 2', 'Ver image 3']);
    });
  });

  describe('thumbnails with a problem', () => {
    it('are marked, by place, and only those', () => {
      const view = mount(
        <MediaCarousel media={IMAGES} onClick={vi.fn()} invalid={[false, true, undefined]} />,
      );

      expect(items(view.container).map((row) => row.hasAttribute('data-invalid'))).toEqual([
        false,
        true,
        false,
      ]);
    });

    it('get a red border that wins over the other colours', () => {
      const view = mount(<MediaCarousel media={IMAGES} onClick={vi.fn()} invalid={[true]} />);

      expect(items(view.container)[0]?.className).toContain('data-invalid:border-red-c!');
    });

    it('are none unless asked for, also with a list shorter than the media', () => {
      const none = mount(<MediaCarousel media={IMAGES} onClick={vi.fn()} />);
      const short = mount(<MediaCarousel media={IMAGES} onClick={vi.fn()} invalid={[true]} />);

      expect(items(none.container).some((row) => row.hasAttribute('data-invalid'))).toBe(false);
      expect(items(short.container).filter((row) => row.hasAttribute('data-invalid'))).toHaveLength(
        1,
      );
    });
  });

  describe('removing', () => {
    it('has no remove button unless handleRemove is given', () => {
      const view = mount(<MediaCarousel media={IMAGES} onClick={vi.fn()} />);

      expect(view.container.querySelectorAll('button')).toHaveLength(3);
    });

    it('has a remove button for each thumbnail, named by what it removes', () => {
      const view = mount(<MediaCarousel media={MIXED} onClick={vi.fn()} handleRemove={vi.fn()} />);
      const removers = [...view.container.querySelectorAll('li > button:nth-child(2)')];

      expect(removers.map((button) => button.getAttribute('aria-label'))).toEqual([
        'Remove image 1',
        'Remove video 2',
        'Remove image 3',
      ]);
    });

    it('removes the one that is pressed, and does not choose it', () => {
      const onClick = vi.fn();
      const handleRemove = vi.fn();
      const view = mount(
        <MediaCarousel media={IMAGES} onClick={onClick} handleRemove={handleRemove} />,
      );

      click(
        required(
          view.container.querySelector('[aria-label="Remove image 2"]'),
          'its remove button',
        ),
      );

      expect(handleRemove).toHaveBeenCalledTimes(1);
      expect(handleRemove).toHaveBeenCalledWith(1);
      expect(onClick).not.toHaveBeenCalled();
    });

    it('has a remove button that is not inside the thumbnail button (a button cannot hold a button)', () => {
      const view = mount(<MediaCarousel media={IMAGES} onClick={vi.fn()} handleRemove={vi.fn()} />);

      expect(view.container.querySelector('button button')).toBeNull();
    });

    it('can be named in the language of the app', () => {
      const view = mount(
        <MediaCarousel
          media={IMAGES}
          onClick={vi.fn()}
          handleRemove={vi.fn()}
          labels={{ remove: (_item, index) => `Quitar ${String(index + 1)}` }}
        />,
      );

      expect(view.container.querySelector('[aria-label="Quitar 1"]')).not.toBeNull();
    });
  });

  describe('the same address twice', () => {
    it('is drawn twice without a warning from React', () => {
      const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
      const view = mount(
        <MediaCarousel
          media={[
            { type: 'image', url: '/a.webp' },
            { type: 'image', url: '/a.webp' },
          ]}
          onClick={vi.fn()}
        />,
      );

      expect(items(view.container)).toHaveLength(2);
      expect(error).not.toHaveBeenCalled();
    });

    it('is drawn three times without a warning from React', () => {
      const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
      const same = { type: 'image', url: '/a.webp' } as const;
      const view = mount(<MediaCarousel media={[same, same, same]} onClick={vi.fn()} />);

      expect(items(view.container)).toHaveLength(3);
      expect(error).not.toHaveBeenCalled();
    });

    it('does not start the others again when one is removed', () => {
      const view = mount(<MediaCarousel media={IMAGES} onClick={vi.fn()} />);
      const [, second, third] = items(view.container);

      view.rerender(<MediaCarousel media={IMAGES.slice(1)} onClick={vi.fn()} />);
      const [newFirst, newSecond] = items(view.container);

      expect(newFirst).toBe(second);
      expect(newSecond).toBe(third);
    });

    it('keeps the second of two equal ones when the first is removed', () => {
      const twice = [
        { type: 'image', url: '/a.webp' },
        { type: 'image', url: '/a.webp' },
      ] as const;
      const view = mount(<MediaCarousel media={twice} onClick={vi.fn()} />);
      const [, second] = items(view.container);

      view.rerender(<MediaCarousel media={twice.slice(0, 1)} onClick={vi.fn()} />);

      expect(items(view.container)).toHaveLength(1);
      expect(items(view.container)[0]).not.toBe(second);
    });
  });

  describe('the row', () => {
    it('has the space around the thumbnails that the focus ring needs, unless told another', () => {
      const plain = mount(<MediaCarousel media={IMAGES} onClick={vi.fn()} />);
      const flush = mount(<MediaCarousel media={IMAGES} onClick={vi.fn()} listClassName="p-0" />);
      const classesOf = (container: HTMLElement) =>
        required(container.querySelector('ul'), 'the list').className.split(/\s+/);

      expect(classesOf(plain.container)).toContain('p-2');
      expect(classesOf(flush.container)).not.toContain('p-2');
      expect(classesOf(flush.container)).toContain('p-0');
    });

    it('gives the classes for the fades to the fades', () => {
      const view = mount(
        <MediaCarousel
          media={IMAGES}
          onClick={vi.fn()}
          gradientClassNames={{ right: 'fade-class' }}
        />,
      );

      setScrollMetrics(scrollerOf(view.container), {
        clientWidth: 100,
        scrollWidth: 500,
        scrollLeft: 0,
      });
      observers.triggerAll();

      expect(view.container.querySelector('[aria-hidden="true"].fade-class')).not.toBeNull();
    });

    it('takes a class for the scroller, and the fades', () => {
      const view = mount(
        <MediaCarousel
          media={IMAGES}
          onClick={vi.fn()}
          className="mine"
          gradientClassNames={{ left: 'from-smoke-eerie' }}
        />,
      );

      expect(scrollerOf(view.container).className).toContain('mine');
      expect(scrollerOf(view.container).className).toContain('w-full');
    });

    it('is named for assistive technology once it scrolls', () => {
      const view = mount(<MediaCarousel media={IMAGES} onClick={vi.fn()} />);
      const scroller = scrollerOf(view.container);

      setScrollMetrics(scroller, { clientWidth: 100, scrollWidth: 500, scrollLeft: 0 });
      observers.triggerAll();

      expect(scroller.getAttribute('aria-label')).toBe('Thumbnails');
      expect(scroller.getAttribute('role')).toBe('region');
    });
  });

  describe('the chosen one', () => {
    const place = (container: HTMLElement, at: number, left: number, width: number) => {
      const row = required(items(container)[at], 'a thumbnail');

      Object.defineProperty(row, 'offsetLeft', { configurable: true, value: left });
      Object.defineProperty(row, 'offsetWidth', { configurable: true, value: width });
    };

    it('is brought to the middle of the row when it changes', () => {
      const view = mount(<MediaCarousel media={IMAGES} onClick={vi.fn()} />);
      const scroller = scrollerOf(view.container);

      Object.defineProperty(scroller, 'clientWidth', { configurable: true, value: 300 });
      place(view.container, 2, 500, 80);
      view.rerender(<MediaCarousel media={IMAGES} selected={2} onClick={vi.fn()} />);

      // 500 - (300 - 80) / 2
      expect(scroller.scrollLeft).toBe(390);
    });

    it('is brought into view when the row starts with it', () => {
      const view = mount(<MediaCarousel media={IMAGES} selected={0} onClick={vi.fn()} />);
      const scroller = scrollerOf(view.container);

      Object.defineProperty(scroller, 'clientWidth', { configurable: true, value: 300 });
      place(view.container, 1, 200, 80);
      view.rerender(<MediaCarousel media={IMAGES} selected={1} onClick={vi.fn()} />);

      expect(scroller.scrollLeft).toBe(90);
    });

    it('moves the row only, never the page', () => {
      const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined);
      const scrollIntoView = vi.fn();

      Element.prototype.scrollIntoView = scrollIntoView;
      const view = mount(<MediaCarousel media={IMAGES} onClick={vi.fn()} />);

      place(view.container, 2, 500, 80);
      view.rerender(<MediaCarousel media={IMAGES} selected={2} onClick={vi.fn()} />);

      expect(scrollTo).not.toHaveBeenCalled();
      expect(scrollIntoView).not.toHaveBeenCalled();
      Reflect.deleteProperty(Element.prototype, 'scrollIntoView');
    });

    it('does not move the row when nothing is chosen', () => {
      const view = mount(<MediaCarousel media={IMAGES} onClick={vi.fn()} />);
      const scroller = scrollerOf(view.container);

      scroller.scrollLeft = 77;
      view.rerender(<MediaCarousel media={IMAGES} selected={null} onClick={vi.fn()} />);

      expect(scroller.scrollLeft).toBe(77);
    });

    it('does not fail when it is not there (the list got shorter)', () => {
      const view = mount(<MediaCarousel media={IMAGES} onClick={vi.fn()} />);

      expect(() => {
        view.rerender(<MediaCarousel media={IMAGES} selected={9} onClick={vi.fn()} />);
      }).not.toThrow();
    });

    it('does not move the row when something else changes', () => {
      const view = mount(<MediaCarousel media={IMAGES} selected={1} onClick={vi.fn()} />);
      const scroller = scrollerOf(view.container);

      scroller.scrollLeft = 55;
      view.rerender(<MediaCarousel media={IMAGES} selected={1} onClick={vi.fn()} className="x" />);

      expect(scroller.scrollLeft).toBe(55);
    });
  });

  it('is the same in StrictMode', () => {
    const onClick = vi.fn();
    const view = mount(<MediaCarousel media={MIXED} selected={0} onClick={onClick} />, {
      strict: true,
    });

    click(required(thumbButtons(view.container)[1], 'the video'));

    expect(items(view.container)).toHaveLength(3);
    expect(onClick).toHaveBeenCalledWith(1);
  });

  // These lines are checked by the type check of the package (`npm run typecheck`), not by vitest.
  it('does not compile without the media or what to do on a press, or with a kind that does not exist', () => {
    const check = () => {
      // @ts-expect-error the media are needed
      <MediaCarousel onClick={() => undefined} />;
      // @ts-expect-error and what to do when one is pressed
      <MediaCarousel media={[]} />;
      // @ts-expect-error a picture or a video
      <MediaCarousel media={[{ type: 'audio', url: 'a.mp3' }]} onClick={() => undefined} />;
      // @ts-expect-error the press tells which one, a number
      <MediaCarousel media={[]} onClick={(index: string) => index} />;
    };

    expect(check).toBeTypeOf('function');
  });
});
