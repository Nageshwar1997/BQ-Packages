// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  click,
  installResizeObserver,
  keyDown,
  required,
  setScrollMetrics,
} from '../test-utils/dom.js';
import { mount, unmountAll } from '../test-utils/react.js';
import type { TMediaOption } from './labels.js';
import { MediaCarouselWithModal } from './MediaCarouselWithModal.js';
import { MediaModal } from './MediaModal.js';

const players = vi.hoisted(() => ({ calls: [] as Record<string, unknown>[] }));

vi.mock('./VideoPlayer.js', () => ({
  VideoPlayer: (props: { videoProps: { src?: string }; showPosterOnly?: boolean }) => {
    players.calls.push({ ...props });

    return (
      <div
        data-testid={props.showPosterOnly ? 'poster' : 'player'}
        data-src={props.videoProps.src}
      />
    );
  },
}));

const MEDIA: TMediaOption[] = [
  { type: 'image', url: '/a.webp' },
  { type: 'image', url: '/b.webp' },
  { type: 'video', url: '/v.mp4' },
];

const dialog = () => document.querySelector<HTMLElement>('[role="dialog"]');
const theDialog = () => required(dialog(), 'the dialog');
const bigPlayer = () =>
  players.calls.findLast((props) => (props.showPosterOnly as boolean | undefined) !== true);
const buttonNamed = (name: string, root: ParentNode = document) =>
  required(root.querySelector<HTMLButtonElement>(`button[aria-label="${name}"]`), name);
const counter = () =>
  required(theDialog().querySelector('[aria-live="polite"]'), 'the counter').textContent;

let observers: ReturnType<typeof installResizeObserver>;

describe('MediaModal', () => {
  beforeEach(() => {
    installResizeObserver();
    players.calls.length = 0;
  });

  afterEach(() => {
    unmountAll();
    vi.unstubAllGlobals();
    document.body.replaceChildren();
    document.body.removeAttribute('style');
  });

  describe('the dialog', () => {
    it('is not there while it is closed', () => {
      mount(<MediaModal media={MEDIA} isOpen={false} onClose={vi.fn()} />);

      expect(dialog()).toBeNull();
    });

    it('is a dialog with the gallery in it, named', () => {
      mount(<MediaModal media={MEDIA} isOpen onClose={vi.fn()} />);

      expect(theDialog().getAttribute('aria-label')).toBe('Media gallery');
      expect(theDialog().querySelector('img[alt="Image 1 of 3"]')).not.toBeNull();
      expect(counter()).toBe('1 of 3');
    });

    it('is named in the language of the app, and so is its close button', () => {
      mount(
        <MediaModal
          media={MEDIA}
          isOpen
          onClose={vi.fn()}
          labels={{ gallery: 'Galería', close: 'Cerrar' }}
        />,
      );

      expect(theDialog().getAttribute('aria-label')).toBe('Galería');
      expect(buttonNamed('Cerrar', theDialog())).toBeTruthy();
    });

    it('gives the words of the app to what is in it', () => {
      mount(
        <MediaModal
          media={MEDIA}
          isOpen
          onClose={vi.fn()}
          labels={{ next: 'Siguiente', select: (_item, index) => `Ver ${String(index + 1)}` }}
        />,
      );

      expect(buttonNamed('Siguiente', theDialog())).toBeTruthy();
      expect(buttonNamed('Ver 2', theDialog())).toBeTruthy();
    });

    it('is not there without media, whatever it is told', () => {
      mount(<MediaModal media={[]} isOpen onClose={vi.fn()} />);

      expect(dialog()).toBeNull();
      expect(document.body.style.overflow).toBe('');
    });

    it('is closed by its close button and by Escape', () => {
      const onClose = vi.fn();

      mount(<MediaModal media={MEDIA} isOpen onClose={onClose} />);

      click(buttonNamed('Close', theDialog()));
      expect(onClose).toHaveBeenCalledTimes(1);

      keyDown(document, 'Escape');
      expect(onClose).toHaveBeenCalledTimes(2);
    });

    it('is closed by a press on the backdrop', () => {
      const onClose = vi.fn();

      mount(<MediaModal media={MEDIA} isOpen onClose={onClose} className="backdrop-mine" />);
      const backdrop = required(theDialog().parentElement, 'the backdrop');

      backdrop.dispatchEvent(new Event('pointerdown', { bubbles: true }));
      click(backdrop);

      expect(backdrop.className).toContain('backdrop-mine');
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('starts on the item asked for', () => {
      mount(<MediaModal media={MEDIA} isOpen onClose={vi.fn()} selected={1} />);

      expect(counter()).toBe('2 of 3');
      expect(theDialog().querySelector('img[alt="Image 2 of 3"]')).not.toBeNull();
    });

    it('can be browsed and the thumbnails can be removed', () => {
      const handleRemove = vi.fn();

      mount(<MediaModal media={MEDIA} isOpen onClose={vi.fn()} handleRemove={handleRemove} />);
      click(buttonNamed('Next', theDialog()));
      click(buttonNamed('Remove image 2', theDialog()));

      expect(counter()).toBe('2 of 3');
      expect(handleRemove).toHaveBeenCalledWith(1);
    });

    it('starts on the item asked for each time it is opened', () => {
      const view = mount(<MediaModal media={MEDIA} isOpen onClose={vi.fn()} selected={0} />);

      click(buttonNamed('Next', theDialog()));
      view.rerender(<MediaModal media={MEDIA} isOpen={false} onClose={vi.fn()} selected={0} />);
      view.rerender(<MediaModal media={MEDIA} isOpen onClose={vi.fn()} selected={0} />);

      expect(counter()).toBe('1 of 3');
    });
  });

  describe('a video in it', () => {
    const open = (videoProps?: Parameters<typeof MediaModal>[0]['videoProps']) => {
      mount(
        <MediaModal media={MEDIA} isOpen onClose={vi.fn()} selected={2} videoProps={videoProps} />,
      );

      return bigPlayer() as { videoProps: Record<string, unknown> } | undefined;
    };

    it('plays by itself, muted, in a loop, and has controls to stop it and unmute it', () => {
      expect(open()?.videoProps).toMatchObject({
        autoPlay: true,
        muted: true,
        loop: true,
        controls: true,
        src: '/v.mp4',
      });
    });

    it('takes what the app says, also when it says no', () => {
      expect(
        open({ autoPlay: false, muted: false, loop: false, controls: false })?.videoProps,
      ).toMatchObject({ autoPlay: false, muted: false, loop: false, controls: false });
    });

    it('keeps the other attributes of the app', () => {
      expect(open({ preload: 'none', 'aria-label': 'Demo' })?.videoProps).toMatchObject({
        preload: 'none',
        'aria-label': 'Demo',
      });
    });

    it('has its own look, after which comes the class of the app', () => {
      const className = open({ className: 'mine' })?.videoProps.className as string;

      expect(className).toContain('object-contain!');
      expect(className).toContain('rounded-lg');
      expect(className.endsWith('mine')).toBe(true);
    });

    it('has its own look alone, when the app has no class', () => {
      const className = open()?.videoProps.className as string;

      expect(className).not.toContain('undefined');
      expect(className.trim()).toBe(className.trim().replace(/\s+$/, ''));
    });

    it('is given what the app asked for the player', () => {
      const onStreamError = vi.fn();

      mount(
        <MediaModal
          media={MEDIA}
          isOpen
          onClose={vi.fn()}
          selected={2}
          playerProps={{ onStreamError }}
        />,
      );

      expect(bigPlayer()).toMatchObject({ onStreamError });
    });
  });
});

describe('MediaCarouselWithModal', () => {
  beforeEach(() => {
    observers = installResizeObserver();
    players.calls.length = 0;
  });

  afterEach(() => {
    unmountAll();
    vi.unstubAllGlobals();
    document.body.replaceChildren();
    document.body.removeAttribute('style');
  });

  const thumbnail = (container: HTMLElement, name: string) => buttonNamed(name, container);

  it('draws nothing without media', () => {
    const view = mount(<MediaCarouselWithModal media={[]} />);

    expect(view.container.innerHTML).toBe('');
    expect(dialog()).toBeNull();
  });

  it('shows the thumbnails and no dialog at first', () => {
    const view = mount(<MediaCarouselWithModal media={MEDIA} />);

    expect(view.container.querySelectorAll('li')).toHaveLength(3);
    expect(dialog()).toBeNull();
    expect(view.container.querySelector('[aria-current]')).toBeNull();
  });

  it('opens the one that is pressed, in the dialog', () => {
    const view = mount(<MediaCarouselWithModal media={MEDIA} />);

    click(thumbnail(view.container, 'Show image 2 of 3'));

    expect(counter()).toBe('2 of 3');
    expect(theDialog().querySelector('img[alt="Image 2 of 3"]')).not.toBeNull();
    expect(view.container.querySelector('[aria-current="true"]')?.getAttribute('aria-label')).toBe(
      'Show image 2 of 3',
    );
  });

  it('closes with the close button, and then opens another one', () => {
    const view = mount(<MediaCarouselWithModal media={MEDIA} />);

    click(thumbnail(view.container, 'Show image 2 of 3'));
    click(buttonNamed('Close', theDialog()));
    expect(dialog()).toBeNull();
    expect(view.container.querySelector('[aria-current]')).toBeNull();

    click(thumbnail(view.container, 'Show video 3 of 3'));

    expect(counter()).toBe('3 of 3');
  });

  it('closes with Escape', () => {
    const view = mount(<MediaCarouselWithModal media={MEDIA} />);

    click(thumbnail(view.container, 'Show image 1 of 3'));
    keyDown(document, 'Escape');

    expect(dialog()).toBeNull();
  });

  it('gives the page its scroll back when it closes', () => {
    const view = mount(<MediaCarouselWithModal media={MEDIA} />);

    click(thumbnail(view.container, 'Show image 1 of 3'));
    expect(document.body.style.overflow).toBe('hidden');

    keyDown(document, 'Escape');

    expect(document.body.style.overflow).toBe('');
  });

  it('closes by itself when the item it was opened on is gone', () => {
    const view = mount(<MediaCarouselWithModal media={MEDIA} />);

    click(thumbnail(view.container, 'Show video 3 of 3'));
    view.rerender(<MediaCarouselWithModal media={MEDIA.slice(0, 2)} />);

    expect(dialog()).toBeNull();
  });

  it('does not open again by itself when the list grows back', () => {
    const view = mount(<MediaCarouselWithModal media={MEDIA} />);

    click(thumbnail(view.container, 'Show video 3 of 3'));
    view.rerender(<MediaCarouselWithModal media={MEDIA.slice(0, 2)} />);
    view.rerender(<MediaCarouselWithModal media={MEDIA} />);

    expect(dialog()).toBeNull();
    expect(view.container.querySelector('[aria-current]')).toBeNull();
  });

  it('closes and draws nothing when the media are all gone, and does not open when they come back', () => {
    const view = mount(<MediaCarouselWithModal media={MEDIA} />);

    click(thumbnail(view.container, 'Show image 1 of 3'));
    view.rerender(<MediaCarouselWithModal media={[]} />);
    expect(dialog()).toBeNull();
    expect(view.container.innerHTML).toBe('');

    view.rerender(<MediaCarouselWithModal media={MEDIA} />);

    expect(dialog()).toBeNull();
  });

  it('gives the classes for the fades to the thumbnails', () => {
    const view = mount(
      <MediaCarouselWithModal media={MEDIA} gradientClassNames={{ right: 'fade-class' }} />,
    );
    const scroller = required(
      view.container.querySelector<HTMLElement>('[class*="overflow-x-auto"]'),
      'the scroller',
    );

    setScrollMetrics(scroller, { clientWidth: 100, scrollWidth: 500, scrollLeft: 0 });
    observers.triggerAll();

    expect(view.container.querySelector('[aria-hidden="true"].fade-class')).not.toBeNull();
  });

  it('has the thumbnails flush with its box, and a class of its own', () => {
    const view = mount(<MediaCarouselWithModal media={MEDIA} className="mine" />);
    const list = required(view.container.querySelector('ul'), 'the list');

    expect(list.className.split(/\s+/)).toContain('p-0');
    expect(required(view.container.firstElementChild, 'the box').className).toContain('mine');
    expect(required(view.container.firstElementChild, 'the box').className).toContain(
      'overflow-hidden',
    );
  });

  it('gives the words of the app to the thumbnails and to the dialog', () => {
    const view = mount(
      <MediaCarouselWithModal
        media={MEDIA}
        labels={{
          select: (_item, index) => `Abrir ${String(index + 1)}`,
          gallery: 'Galería',
          close: 'Cerrar',
        }}
      />,
    );

    click(thumbnail(view.container, 'Abrir 1'));

    expect(theDialog().getAttribute('aria-label')).toBe('Galería');
    expect(buttonNamed('Cerrar', theDialog())).toBeTruthy();
  });

  it('gives the attributes of the videos to the dialog, and the player props to the players', () => {
    const onStreamError = vi.fn();
    const view = mount(
      <MediaCarouselWithModal
        media={MEDIA}
        videoProps={{ loop: false }}
        playerProps={{ onStreamError }}
      />,
    );

    click(thumbnail(view.container, 'Show video 3 of 3'));

    expect(bigPlayer()).toMatchObject({ videoProps: { loop: false }, onStreamError });
  });

  it('is the same in StrictMode', () => {
    const view = mount(<MediaCarouselWithModal media={MEDIA} />, { strict: true });

    click(thumbnail(view.container, 'Show image 2 of 3'));

    expect(counter()).toBe('2 of 3');
  });

  // These lines are checked by the type check of the package (`npm run typecheck`), not by vitest.
  it('does not compile without media', () => {
    const check = () => {
      // @ts-expect-error the media are needed
      <MediaCarouselWithModal />;
      // @ts-expect-error and the dialog is told whether it is open and what closes it
      <MediaModal media={[]} />;
    };

    expect(check).toBeTypeOf('function');
  });
});
