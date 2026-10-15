// @vitest-environment jsdom
import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { click, installResizeObserver, keyDown, required } from '../test-utils/dom.js';
import { mount, unmountAll } from '../test-utils/react.js';
import type { TMediaOption } from './labels.js';
import { MediaCarouselWithParentMedia } from './MediaCarouselWithParentMedia.js';

const players = vi.hoisted(() => ({ calls: [] as Record<string, unknown>[], mounts: 0 }));

vi.mock('./VideoPlayer.js', async () => {
  const { useEffect } = await import('react');

  return {
    VideoPlayer: (props: {
      videoProps: { src?: string };
      showPosterOnly?: boolean;
      className?: string;
    }) => {
      players.calls.push({ ...props });
      useEffect(() => {
        players.mounts += 1;
      }, []);

      return (
        <div
          data-testid={props.showPosterOnly ? 'poster' : 'player'}
          data-src={props.videoProps.src}
        />
      );
    },
  };
});

const MEDIA: TMediaOption[] = [
  { type: 'image', url: '/a.webp' },
  { type: 'image', url: '/b.webp' },
  { type: 'video', url: '/v.mp4' },
];

const mainImage = (container: HTMLElement) =>
  required(container.querySelector('img[alt]:not([alt=""])'), 'the picture');
const buttonNamed = (container: HTMLElement, name: string) =>
  required(container.querySelector<HTMLButtonElement>(`button[aria-label="${name}"]`), name);
const counter = (container: HTMLElement) =>
  required(container.querySelector('[aria-live="polite"]'), 'the counter').textContent;
const current = (container: HTMLElement) =>
  container.querySelector('button[aria-current="true"]')?.getAttribute('aria-label');
const rootOf = (container: HTMLElement) => required(container.firstElementChild, 'the carousel');

describe('MediaCarouselWithParentMedia', () => {
  beforeEach(() => {
    installResizeObserver();
    players.calls.length = 0;
    players.mounts = 0;
  });

  afterEach(() => {
    unmountAll();
    vi.unstubAllGlobals();
  });

  it('draws nothing without media', () => {
    const view = mount(<MediaCarouselWithParentMedia media={[]} />);

    expect(view.container.innerHTML).toBe('');
  });

  describe('the group', () => {
    it('is a carousel, named', () => {
      const view = mount(<MediaCarouselWithParentMedia media={MEDIA} />);
      const root = rootOf(view.container);

      expect(root.getAttribute('role')).toBe('group');
      expect(root.getAttribute('aria-roledescription')).toBe('carousel');
      expect(root.getAttribute('aria-label')).toBe('Media gallery');
    });

    it('can be named another way, and take a class', () => {
      const view = mount(
        <MediaCarouselWithParentMedia
          media={MEDIA}
          className="mine"
          labels={{ gallery: 'Product photos' }}
        />,
      );

      expect(rootOf(view.container).getAttribute('aria-label')).toBe('Product photos');
      expect(rootOf(view.container).className).toContain('mine');
    });
  });

  describe('with one item', () => {
    it('shows it big, with nothing to move through', () => {
      const view = mount(
        <MediaCarouselWithParentMedia media={[{ type: 'image', url: '/one.webp' }]} />,
      );

      expect(mainImage(view.container).getAttribute('src')).toBe('/one.webp');
      expect(mainImage(view.container).getAttribute('alt')).toBe('Image 1 of 1');
      expect(view.container.querySelector('button')).toBeNull();
      expect(view.container.querySelector('[aria-live]')).toBeNull();
      expect(view.container.querySelector('hr, [role="separator"]')).toBeNull();
    });

    it('does not load the big picture late: it is what the page shows first', () => {
      const view = mount(
        <MediaCarouselWithParentMedia media={[{ type: 'image', url: '/one.webp' }]} />,
      );

      expect(mainImage(view.container).hasAttribute('loading')).toBe(false);
    });
  });

  describe('with several items', () => {
    it('shows the first one, a counter, two buttons and the thumbnails', () => {
      const view = mount(<MediaCarouselWithParentMedia media={MEDIA} />);

      expect(mainImage(view.container).getAttribute('src')).toBe('/a.webp');
      expect(counter(view.container)).toBe('1 of 3');
      expect(buttonNamed(view.container, 'Previous')).toBeTruthy();
      expect(buttonNamed(view.container, 'Next')).toBeTruthy();
      expect(view.container.querySelectorAll('li')).toHaveLength(3);
      expect(current(view.container)).toBe('Show image 1 of 3');
    });

    it('says the counter in a way that is read out when it changes', () => {
      const view = mount(<MediaCarouselWithParentMedia media={MEDIA} />);
      const live = required(view.container.querySelector('[aria-live]'), 'the counter');

      expect(live.getAttribute('aria-live')).toBe('polite');
      expect(live.getAttribute('aria-atomic')).toBe('true');
    });

    it('goes to the next one, and round to the first after the last', () => {
      const view = mount(<MediaCarouselWithParentMedia media={MEDIA} />);

      click(buttonNamed(view.container, 'Next'));
      expect(mainImage(view.container).getAttribute('src')).toBe('/b.webp');
      expect(counter(view.container)).toBe('2 of 3');
      expect(current(view.container)).toBe('Show image 2 of 3');

      click(buttonNamed(view.container, 'Next'));
      expect(counter(view.container)).toBe('3 of 3');

      click(buttonNamed(view.container, 'Next'));
      expect(counter(view.container)).toBe('1 of 3');
      expect(mainImage(view.container).getAttribute('src')).toBe('/a.webp');
    });

    it('counts every press, also when two come before it draws again', () => {
      const view = mount(<MediaCarouselWithParentMedia media={MEDIA} />);
      const next = buttonNamed(view.container, 'Next');

      act(() => {
        next.click();
        next.click();
      });

      expect(counter(view.container)).toBe('3 of 3');
    });

    it('goes to the one before, and round to the last before the first', () => {
      const view = mount(<MediaCarouselWithParentMedia media={MEDIA} />);

      click(buttonNamed(view.container, 'Previous'));
      expect(counter(view.container)).toBe('3 of 3');

      click(buttonNamed(view.container, 'Previous'));
      expect(counter(view.container)).toBe('2 of 3');
      expect(mainImage(view.container).getAttribute('src')).toBe('/b.webp');
    });

    it('goes to the one whose thumbnail is pressed', () => {
      const view = mount(<MediaCarouselWithParentMedia media={MEDIA} />);

      click(buttonNamed(view.container, 'Show image 2 of 3'));

      expect(mainImage(view.container).getAttribute('src')).toBe('/b.webp');
      expect(counter(view.container)).toBe('2 of 3');
      expect(current(view.container)).toBe('Show image 2 of 3');
    });

    it('names each picture by its place', () => {
      const view = mount(<MediaCarouselWithParentMedia media={MEDIA} />);

      click(buttonNamed(view.container, 'Next'));

      expect(mainImage(view.container).getAttribute('alt')).toBe('Image 2 of 3');
    });

    it('says everything in the language of the app', () => {
      const view = mount(
        <MediaCarouselWithParentMedia
          media={MEDIA}
          labels={{
            previous: 'Anterior',
            next: 'Siguiente',
            counter: (index, total) => `${String(index + 1)} de ${String(total)}`,
            preview: (_item, index) => `Foto ${String(index + 1)}`,
          }}
        />,
      );

      expect(counter(view.container)).toBe('1 de 3');
      expect(mainImage(view.container).getAttribute('alt')).toBe('Foto 1');

      click(buttonNamed(view.container, 'Siguiente'));

      expect(counter(view.container)).toBe('2 de 3');
      expect(buttonNamed(view.container, 'Anterior')).toBeTruthy();
    });

    it('has no buttons and no counter when it is told so, but still has the thumbnails', () => {
      const view = mount(<MediaCarouselWithParentMedia media={MEDIA} needButtonControls={false} />);

      expect(view.container.querySelector('[aria-label="Next"]')).toBeNull();
      expect(view.container.querySelector('[aria-label="Previous"]')).toBeNull();
      expect(view.container.querySelector('[aria-live]')).toBeNull();
      expect(view.container.querySelectorAll('li')).toHaveLength(3);
    });

    it('gives the thumbnails the remove button when the app wants one', () => {
      const handleRemove = vi.fn();
      const view = mount(
        <MediaCarouselWithParentMedia media={MEDIA} handleRemove={handleRemove} />,
      );

      click(buttonNamed(view.container, 'Remove image 2'));

      expect(handleRemove).toHaveBeenCalledWith(1);
    });

    it('gives the thumbnails the words of the app', () => {
      const view = mount(
        <MediaCarouselWithParentMedia
          media={MEDIA}
          labels={{ select: (_item, index) => `Ir a ${String(index + 1)}` }}
        />,
      );

      expect(buttonNamed(view.container, 'Ir a 2')).toBeTruthy();
    });
  });

  describe('the item to start with', () => {
    it('is the one asked for', () => {
      const view = mount(<MediaCarouselWithParentMedia media={MEDIA} selected={1} />);

      expect(counter(view.container)).toBe('2 of 3');
      expect(mainImage(view.container).getAttribute('src')).toBe('/b.webp');
    });

    it('is the first one for null', () => {
      const view = mount(<MediaCarouselWithParentMedia media={MEDIA} selected={null} />);

      expect(counter(view.container)).toBe('1 of 3');
    });

    it('is the last one when it is further than the list', () => {
      const view = mount(<MediaCarouselWithParentMedia media={MEDIA} selected={9} />);

      expect(counter(view.container)).toBe('3 of 3');
    });

    it('follows the parent when it asks for another one', () => {
      const view = mount(<MediaCarouselWithParentMedia media={MEDIA} selected={0} />);

      view.rerender(<MediaCarouselWithParentMedia media={MEDIA} selected={2} />);

      expect(counter(view.container)).toBe('3 of 3');
    });

    it('is not asked again at every render: what the person chose stays', () => {
      const view = mount(<MediaCarouselWithParentMedia media={MEDIA} selected={0} />);

      click(buttonNamed(view.container, 'Next'));
      view.rerender(<MediaCarouselWithParentMedia media={MEDIA} selected={0} className="x" />);

      expect(counter(view.container)).toBe('2 of 3');
    });

    it('keeps what the person chose when the parent lets go of the choice (null)', () => {
      const view = mount(<MediaCarouselWithParentMedia media={MEDIA} selected={1} />);

      view.rerender(<MediaCarouselWithParentMedia media={MEDIA} selected={null} />);

      expect(counter(view.container)).toBe('2 of 3');
    });

    it('follows the parent to the same item again after the person moved', () => {
      const view = mount(<MediaCarouselWithParentMedia media={MEDIA} selected={1} />);

      click(buttonNamed(view.container, 'Next'));
      view.rerender(<MediaCarouselWithParentMedia media={MEDIA} selected={null} />);
      view.rerender(<MediaCarouselWithParentMedia media={MEDIA} selected={1} />);

      expect(counter(view.container)).toBe('2 of 3');
    });
  });

  describe('when the list changes', () => {
    it('shows the new last one when the one shown is gone from the end', () => {
      const view = mount(<MediaCarouselWithParentMedia media={MEDIA} selected={2} />);

      view.rerender(<MediaCarouselWithParentMedia media={MEDIA.slice(0, 2)} selected={2} />);

      expect(counter(view.container)).toBe('2 of 2');
      expect(mainImage(view.container).getAttribute('src')).toBe('/b.webp');
      expect(current(view.container)).toBe('Show image 2 of 2');
    });

    it('has no controls when one is left, and nothing when none is', () => {
      const view = mount(<MediaCarouselWithParentMedia media={MEDIA} />);

      view.rerender(<MediaCarouselWithParentMedia media={MEDIA.slice(0, 1)} />);
      expect(view.container.querySelector('button')).toBeNull();

      view.rerender(<MediaCarouselWithParentMedia media={[]} />);
      expect(view.container.innerHTML).toBe('');
    });

    it('goes on from where it was when items are added', () => {
      const view = mount(<MediaCarouselWithParentMedia media={MEDIA.slice(0, 2)} />);

      click(buttonNamed(view.container, 'Next'));
      view.rerender(<MediaCarouselWithParentMedia media={MEDIA} />);

      expect(counter(view.container)).toBe('2 of 3');
    });
  });

  describe('a video', () => {
    it('is played in the big place, with the attributes of the app and its own source', () => {
      const view = mount(
        <MediaCarouselWithParentMedia
          media={MEDIA}
          selected={2}
          videoProps={{ controls: true, src: '/ignored.mp4' }}
        />,
      );
      const player = required(view.container.querySelector('[data-testid="player"]'), 'the player');
      const call = players.calls.find(
        (props) => (props.showPosterOnly as boolean | undefined) !== true,
      );

      expect(player.getAttribute('data-src')).toBe('/v.mp4');
      expect(call).toMatchObject({
        videoProps: { controls: true, src: '/v.mp4', 'aria-label': 'Video 3 of 3' },
      });
    });

    it('is named by the app when it wants to', () => {
      mount(
        <MediaCarouselWithParentMedia
          media={MEDIA}
          selected={2}
          videoProps={{ 'aria-label': 'How to use it' }}
        />,
      );
      const call = players.calls.find(
        (props) => (props.showPosterOnly as boolean | undefined) !== true,
      );

      expect(call).toMatchObject({ videoProps: { 'aria-label': 'How to use it' } });
    });

    it('is given what the app asked for the player', () => {
      const onStreamError = vi.fn();

      mount(
        <MediaCarouselWithParentMedia
          media={MEDIA}
          selected={2}
          playerProps={{ onStreamError, placeholder: '/p.webp' }}
        />,
      );
      const big = players.calls.find(
        (props) => (props.showPosterOnly as boolean | undefined) !== true,
      );
      const poster = players.calls.find((props) => props.showPosterOnly === true);

      expect(big).toMatchObject({ onStreamError, placeholder: '/p.webp' });
      expect(poster).toMatchObject({ onStreamError, placeholder: '/p.webp' });
    });

    it('is shown as a poster in the thumbnails', () => {
      const view = mount(<MediaCarouselWithParentMedia media={MEDIA} selected={0} />);

      expect(view.container.querySelector('[data-testid="poster"]')).not.toBeNull();
      expect(view.container.querySelector('[data-testid="player"]')).toBeNull();
    });

    it('is a new player for each video, so one does not go on in the place of another', () => {
      const media: TMediaOption[] = [
        { type: 'video', url: '/v1.mp4' },
        { type: 'video', url: '/v2.mp4' },
      ];
      const view = mount(<MediaCarouselWithParentMedia media={media} />);
      const before = players.mounts;

      click(buttonNamed(view.container, 'Next'));

      // the posters of the thumbnails stay; the big player is made again
      expect(players.mounts - before).toBe(1);
    });

    it('changes back to a picture', () => {
      const view = mount(<MediaCarouselWithParentMedia media={MEDIA} selected={2} />);

      click(buttonNamed(view.container, 'Previous'));

      expect(view.container.querySelector('[data-testid="player"]')).toBeNull();
      expect(mainImage(view.container).getAttribute('src')).toBe('/b.webp');
    });
  });

  describe('the arrow keys', () => {
    it('go to the next and the previous item, from anywhere in the carousel', () => {
      const view = mount(<MediaCarouselWithParentMedia media={MEDIA} />);
      const from = buttonNamed(view.container, 'Show image 1 of 3');

      keyDown(from, 'ArrowRight');
      expect(counter(view.container)).toBe('2 of 3');

      keyDown(from, 'ArrowLeft');
      expect(counter(view.container)).toBe('1 of 3');

      keyDown(from, 'ArrowLeft');
      expect(counter(view.container)).toBe('3 of 3');
    });

    it('keep the page from moving with them', () => {
      const view = mount(<MediaCarouselWithParentMedia media={MEDIA} />);

      const event = keyDown(buttonNamed(view.container, 'Next'), 'ArrowRight');

      expect(event.defaultPrevented).toBe(true);
    });

    it('leave other keys alone', () => {
      const view = mount(<MediaCarouselWithParentMedia media={MEDIA} />);

      const event = keyDown(buttonNamed(view.container, 'Next'), 'ArrowUp');
      keyDown(buttonNamed(view.container, 'Next'), 'a');

      expect(event.defaultPrevented).toBe(false);
      expect(counter(view.container)).toBe('1 of 3');
    });

    it.each(['altKey', 'ctrlKey', 'metaKey', 'shiftKey'] as const)(
      'leave alone the keys that are pressed with %s: a shortcut of the browser',
      (modifier) => {
        const view = mount(<MediaCarouselWithParentMedia media={MEDIA} />);

        const event = keyDown(buttonNamed(view.container, 'Next'), 'ArrowRight', {
          [modifier]: true,
        });

        expect(event.defaultPrevented).toBe(false);
        expect(counter(view.container)).toBe('1 of 3');
      },
    );

    it('leave alone a video (it seeks with them) and a field (it moves the cursor)', () => {
      const view = mount(<MediaCarouselWithParentMedia media={MEDIA} />);
      const video = document.createElement('video');
      const input = document.createElement('input');
      const textarea = document.createElement('textarea');
      const editable = document.createElement('div');

      Object.defineProperty(editable, 'isContentEditable', { value: true });
      for (const element of [video, input, textarea, editable])
        rootOf(view.container).append(element);

      for (const element of [video, input, textarea, editable]) {
        const event = keyDown(element, 'ArrowRight');

        expect(event.defaultPrevented).toBe(false);
      }

      expect(counter(view.container)).toBe('1 of 3');
    });

    it('do nothing when there are no buttons for them, or only one item', () => {
      const without = mount(
        <MediaCarouselWithParentMedia media={MEDIA} needButtonControls={false} />,
      );
      const single = mount(<MediaCarouselWithParentMedia media={MEDIA.slice(0, 1)} />);

      const event = keyDown(rootOf(without.container), 'ArrowRight');
      keyDown(rootOf(single.container), 'ArrowRight');

      expect(event.defaultPrevented).toBe(false);
      expect(current(without.container)).toBe('Show image 1 of 3');
      expect(single.container.querySelector('img')?.getAttribute('src')).toBe('/a.webp');
    });
  });

  it('is the same in StrictMode', () => {
    const view = mount(<MediaCarouselWithParentMedia media={MEDIA} />, { strict: true });

    click(buttonNamed(view.container, 'Next'));

    expect(counter(view.container)).toBe('2 of 3');
  });

  // These lines are checked by the type check of the package (`npm run typecheck`), not by vitest.
  it('does not compile without media, or with a kind that does not exist', () => {
    const check = () => {
      // @ts-expect-error the media are needed
      <MediaCarouselWithParentMedia />;
      // @ts-expect-error a picture or a video
      <MediaCarouselWithParentMedia media={[{ type: 'audio', url: 'a' }]} />;
      // @ts-expect-error the choice is the number of an item
      <MediaCarouselWithParentMedia media={[]} selected="1" />;
    };

    expect(check).toBeTypeOf('function');
  });
});
