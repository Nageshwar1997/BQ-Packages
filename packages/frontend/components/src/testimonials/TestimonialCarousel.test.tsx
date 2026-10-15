// @vitest-environment jsdom
import { Icon } from '@iconify/react';
import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { click, focus, required } from '../test-utils/dom.js';
import { mount, unmountAll } from '../test-utils/react.js';
import { type ITestimonial, TestimonialCarousel } from './TestimonialCarousel.js';

const PEOPLE: ITestimonial[] = [
  { name: 'Asha Rao', role: 'Founder', content: 'Lovely products.', image: '/asha.webp' },
  { name: 'Ben Okafor', content: 'Fast delivery.' },
  { name: 'Chen Wei', role: 'Customer', content: 'My skin loves it.', rating: 4 },
];

const slides = (container: HTMLElement) => [...container.querySelectorAll('figure')];
const visible = (container: HTMLElement) =>
  required(container.querySelector('figure:not([hidden])'), 'the slide that shows');
const visibleName = (container: HTMLElement) =>
  required(visible(container).querySelector('cite'), 'its name').textContent;
const buttonNamed = (container: HTMLElement, name: string) =>
  required(container.querySelector<HTMLButtonElement>(`button[aria-label="${name}"]`), name);
const groupOf = (container: HTMLElement) =>
  required(container.firstElementChild as HTMLElement | null, 'the carousel');

const advance = (ms: number) => {
  act(() => {
    vi.advanceTimersByTime(ms);
  });
};

const pointer = (target: Element, type: 'pointerover' | 'pointerout', pointerType: string) => {
  const event = new MouseEvent(type, { bubbles: true, relatedTarget: null });

  Object.defineProperty(event, 'pointerType', { value: pointerType });
  act(() => {
    target.dispatchEvent(event);
  });
};
const hover = (target: Element, pointerType = 'mouse') => {
  pointer(target, 'pointerover', pointerType);
};
const unhover = (target: Element, pointerType = 'mouse') => {
  pointer(target, 'pointerout', pointerType);
};

const stubReducedMotion = (reduced: boolean) => {
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({
      matches: reduced,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    })),
  );
};

describe('TestimonialCarousel', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    stubReducedMotion(false);
  });

  afterEach(() => {
    unmountAll();
    vi.useRealTimers();
    vi.unstubAllGlobals();
    document.body.replaceChildren();
  });

  it('draws nothing without testimonials', () => {
    const view = mount(<TestimonialCarousel testimonials={[]} />);

    expect(view.container.innerHTML).toBe('');
  });

  describe('the group', () => {
    it('is a carousel, named', () => {
      const view = mount(<TestimonialCarousel testimonials={PEOPLE} />);

      expect(groupOf(view.container).getAttribute('role')).toBe('group');
      expect(groupOf(view.container).getAttribute('aria-roledescription')).toBe('carousel');
      expect(groupOf(view.container).getAttribute('aria-label')).toBe('Testimonials');
    });

    it('takes a class, after its own', () => {
      const view = mount(<TestimonialCarousel testimonials={PEOPLE} className="mine" />);

      expect(groupOf(view.container).className).toMatch(/rounded-lg p-4 mine$/);
    });

    it('has a slide for each testimonial, named by its place, and shows the first', () => {
      const view = mount(<TestimonialCarousel testimonials={PEOPLE} />);

      expect(slides(view.container)).toHaveLength(3);
      expect(slides(view.container).map((slide) => slide.getAttribute('aria-label'))).toEqual([
        '1 of 3',
        '2 of 3',
        '3 of 3',
      ]);
      expect(
        slides(view.container).map((slide) => slide.getAttribute('aria-roledescription')),
      ).toEqual(['slide', 'slide', 'slide']);
      expect(slides(view.container).map((slide) => slide.hasAttribute('hidden'))).toEqual([
        false,
        true,
        true,
      ]);
    });
  });

  describe('a slide', () => {
    it('is a quote with who said it', () => {
      const view = mount(<TestimonialCarousel testimonials={PEOPLE} />);
      const slide = visible(view.container);

      expect(required(slide.querySelector('blockquote p'), 'the quote').textContent).toBe(
        'Lovely products.',
      );
      expect(required(slide.querySelector('figcaption cite'), 'the name').textContent).toBe(
        'Asha Rao',
      );
      expect(required(slide.querySelector('figcaption'), 'the caption').textContent).toContain(
        'Founder',
      );
    });

    it('puts the quotation marks with css, so they are not in the text', () => {
      const view = mount(<TestimonialCarousel testimonials={PEOPLE} />);
      const quote = required(visible(view.container).querySelector('blockquote p'), 'the quote');

      expect(quote.textContent).not.toContain('“');
      expect(quote.className).toContain("before:content-['“']");
      expect(quote.className).toContain("after:content-['”']");
    });

    it('shows no role when it has none (the initials and the name only)', () => {
      const view = mount(<TestimonialCarousel testimonials={PEOPLE} />);

      click(buttonNamed(view.container, 'Next testimonial'));

      expect(visibleName(view.container)).toBe('Ben Okafor');
      expect(
        required(visible(view.container).querySelector('figcaption'), 'the caption').textContent,
      ).toBe('BOBen Okafor');
      // not even an empty line for the role
      expect(
        visible(view.container).querySelectorAll('figcaption > span:last-child > span'),
      ).toHaveLength(0);
    });

    it('shows the photo of the person, with no words (their name is next to it)', () => {
      const view = mount(<TestimonialCarousel testimonials={PEOPLE} />);
      const photo = required(visible(view.container).querySelector('img'), 'the photo');

      expect(photo.getAttribute('src')).toBe('/asha.webp');
      expect(photo.getAttribute('alt')).toBe('');
      expect(photo.getAttribute('loading')).toBe('lazy');
    });

    it('shows the initials without a photo, which are not read out', () => {
      const view = mount(<TestimonialCarousel testimonials={PEOPLE} />);

      click(buttonNamed(view.container, 'Next testimonial'));
      const slide = visible(view.container);
      const initials = required(
        slide.querySelector('figcaption [aria-hidden="true"]'),
        'the initials',
      );

      expect(slide.querySelector('img')).toBeNull();
      expect(initials.textContent).toBe('BO');
    });

    it.each([
      ['Nageshwar Pawar', 'NP'],
      ['Cher', 'C'],
      ['  ada   lovelace  ', 'AL'],
      ['Mary Jane Watson', 'MJ'],
      ['Åsa Öberg', 'ÅÖ'],
      ['😀 Smile', '😀S'],
      ['', ''],
    ])('makes the initials of "%s": %s', (name, expected) => {
      const view = mount(<TestimonialCarousel testimonials={[{ name, content: 'x' }]} />);

      expect(
        required(
          visible(view.container).querySelector('figcaption [aria-hidden="true"]'),
          'the initials',
        ).textContent,
      ).toBe(expected);
    });

    describe('the stars', () => {
      const starsOf = (slide: Element) => slide.querySelectorAll('svg').length;
      const said = (slide: Element) =>
        required(slide.querySelector('.sr-only'), 'what is said about the stars').textContent;

      it('are five unless the rating says another number, and are said in words', () => {
        const view = mount(<TestimonialCarousel testimonials={PEOPLE} interval={0} />);

        expect(starsOf(visible(view.container))).toBe(5);
        expect(said(visible(view.container))).toBe('Rated 5 out of 5');

        click(buttonNamed(view.container, 'Next testimonial'));
        click(buttonNamed(view.container, 'Next testimonial'));

        expect(starsOf(visible(view.container))).toBe(4);
        expect(said(visible(view.container))).toBe('Rated 4 out of 5');
      });

      it.each([
        [0, 0],
        [-3, 0],
        [2.4, 2],
        [2.6, 3],
        [5, 5],
        [9, 5],
      ])('are kept in range: rating %s shows %s', (rating, shown) => {
        const view = mount(
          <TestimonialCarousel testimonials={[{ name: 'A', content: 'x', rating }]} />,
        );

        expect(starsOf(visible(view.container))).toBe(shown);
        expect(said(visible(view.container))).toBe(`Rated ${String(shown)} out of 5`);
      });

      it('can be said in another language', () => {
        const view = mount(
          <TestimonialCarousel
            testimonials={PEOPLE}
            labels={{ rating: (rating) => `${String(rating)} estrellas` }}
          />,
        );

        expect(said(visible(view.container))).toBe('5 estrellas');
      });
    });
  });

  describe('the buttons', () => {
    it('are not there for one testimonial', () => {
      const view = mount(<TestimonialCarousel testimonials={PEOPLE.slice(0, 1)} />);

      expect(view.container.querySelector('button')).toBeNull();
    });

    it('are previous, next and pause', () => {
      const view = mount(<TestimonialCarousel testimonials={PEOPLE} />);

      expect(
        [...view.container.querySelectorAll('button')].map((button) =>
          button.getAttribute('aria-label'),
        ),
      ).toEqual(['Pause the testimonials', 'Previous testimonial', 'Next testimonial']);
      expect(view.container.querySelectorAll('button[type="button"]')).toHaveLength(3);
    });

    it('go to the next testimonial, round to the first after the last', () => {
      const view = mount(<TestimonialCarousel testimonials={PEOPLE} interval={0} />);
      const next = buttonNamed(view.container, 'Next testimonial');

      click(next);
      expect(visibleName(view.container)).toBe('Ben Okafor');

      click(next);
      expect(visibleName(view.container)).toBe('Chen Wei');

      click(next);
      expect(visibleName(view.container)).toBe('Asha Rao');
    });

    it('go to the one before, round to the last before the first', () => {
      const view = mount(<TestimonialCarousel testimonials={PEOPLE} interval={0} />);
      const previous = buttonNamed(view.container, 'Previous testimonial');

      click(previous);
      expect(visibleName(view.container)).toBe('Chen Wei');

      click(previous);
      expect(visibleName(view.container)).toBe('Ben Okafor');
    });

    it('are named in the language of the app', () => {
      const view = mount(
        <TestimonialCarousel
          testimonials={PEOPLE}
          labels={{
            carousel: 'Opiniones',
            previous: 'Anterior',
            next: 'Siguiente',
            pause: 'Pausar',
            play: 'Reproducir',
            slide: (index, total) => `${String(index + 1)} de ${String(total)}`,
          }}
        />,
      );

      expect(groupOf(view.container).getAttribute('aria-label')).toBe('Opiniones');
      expect(buttonNamed(view.container, 'Anterior')).toBeTruthy();
      expect(buttonNamed(view.container, 'Siguiente')).toBeTruthy();
      expect(buttonNamed(view.container, 'Pausar')).toBeTruthy();
      expect(slides(view.container)[0]?.getAttribute('aria-label')).toBe('1 de 3');

      click(buttonNamed(view.container, 'Pausar'));

      expect(buttonNamed(view.container, 'Reproducir')).toBeTruthy();
    });

    it('keep their place when the slide changes, so the focus is not lost', () => {
      const view = mount(<TestimonialCarousel testimonials={PEOPLE} interval={0} />);
      const next = buttonNamed(view.container, 'Next testimonial');

      focus(next);
      click(next);

      expect(document.activeElement).toBe(next);
      expect(next.isConnected).toBe(true);
    });
  });

  describe('turning by itself', () => {
    it('goes to the next testimonial every five seconds, round to the first', () => {
      const view = mount(<TestimonialCarousel testimonials={PEOPLE} />);

      advance(4999);
      expect(visibleName(view.container)).toBe('Asha Rao');

      advance(1);
      expect(visibleName(view.container)).toBe('Ben Okafor');

      advance(5000);
      expect(visibleName(view.container)).toBe('Chen Wei');

      advance(5000);
      expect(visibleName(view.container)).toBe('Asha Rao');
    });

    it('goes at the time it is told', () => {
      const view = mount(<TestimonialCarousel testimonials={PEOPLE} interval={2000} />);

      advance(1999);
      expect(visibleName(view.container)).toBe('Asha Rao');

      advance(1);
      expect(visibleName(view.container)).toBe('Ben Okafor');
    });

    it('goes at a new time when it is given one', () => {
      const view = mount(<TestimonialCarousel testimonials={PEOPLE} interval={2000} />);

      view.rerender(<TestimonialCarousel testimonials={PEOPLE} interval={4000} />);
      advance(3999);
      expect(visibleName(view.container)).toBe('Asha Rao');

      advance(1);
      expect(visibleName(view.container)).toBe('Ben Okafor');
    });

    it('does not turn with an interval of 0, and has nothing to pause then', () => {
      const view = mount(<TestimonialCarousel testimonials={PEOPLE} interval={0} />);

      expect(vi.getTimerCount()).toBe(0);

      advance(60_000);

      expect(visibleName(view.container)).toBe('Asha Rao');
      expect(view.container.querySelector('[aria-label="Pause the testimonials"]')).toBeNull();
    });

    it('does not turn with one testimonial', () => {
      const view = mount(<TestimonialCarousel testimonials={PEOPLE.slice(0, 1)} />);

      expect(vi.getTimerCount()).toBe(0);

      advance(60_000);

      expect(visibleName(view.container)).toBe('Asha Rao');
    });

    it('waits the whole time again after the person moved it', () => {
      const view = mount(<TestimonialCarousel testimonials={PEOPLE} />);

      advance(4000);
      click(buttonNamed(view.container, 'Next testimonial'));
      expect(visibleName(view.container)).toBe('Ben Okafor');

      advance(4999);
      expect(visibleName(view.container)).toBe('Ben Okafor');

      advance(1);
      expect(visibleName(view.container)).toBe('Chen Wei');
    });

    it('has no timer left when it is removed', () => {
      const view = mount(<TestimonialCarousel testimonials={PEOPLE} />);

      expect(vi.getTimerCount()).toBe(1);

      view.unmount();

      expect(vi.getTimerCount()).toBe(0);
    });

    it('keeps one timer in StrictMode', () => {
      mount(<TestimonialCarousel testimonials={PEOPLE} />, { strict: true });

      expect(vi.getTimerCount()).toBe(1);
    });

    it('goes on from the last one when the list gets shorter than the place it was at', () => {
      const view = mount(<TestimonialCarousel testimonials={PEOPLE} />);

      click(buttonNamed(view.container, 'Previous testimonial'));
      expect(visibleName(view.container)).toBe('Chen Wei');

      view.rerender(<TestimonialCarousel testimonials={PEOPLE.slice(0, 2)} />);
      expect(visibleName(view.container)).toBe('Ben Okafor');

      advance(5000);

      expect(visibleName(view.container)).toBe('Asha Rao');
    });

    it('goes on when the list gets shorter than the place it was at', () => {
      const view = mount(<TestimonialCarousel testimonials={PEOPLE} interval={0} />);

      click(buttonNamed(view.container, 'Previous testimonial'));
      expect(visibleName(view.container)).toBe('Chen Wei');

      view.rerender(<TestimonialCarousel testimonials={PEOPLE.slice(0, 2)} interval={0} />);

      expect(visibleName(view.container)).toBe('Ben Okafor');

      click(buttonNamed(view.container, 'Next testimonial'));
      expect(visibleName(view.container)).toBe('Asha Rao');
    });

    it('is said only when it is not turning, so a screen reader is not interrupted', () => {
      const view = mount(<TestimonialCarousel testimonials={PEOPLE} />);
      const live = () =>
        required(view.container.querySelector('[aria-live]'), 'the live area').getAttribute(
          'aria-live',
        );

      expect(live()).toBe('off');

      click(buttonNamed(view.container, 'Pause the testimonials'));

      expect(live()).toBe('polite');
    });

    it('is said when it does not turn at all', () => {
      const view = mount(<TestimonialCarousel testimonials={PEOPLE} interval={0} />);

      expect(
        required(view.container.querySelector('[aria-live]'), 'the live area').getAttribute(
          'aria-live',
        ),
      ).toBe('polite');
    });
  });

  describe('the pointer', () => {
    it('stops it while a mouse is over it, and goes on after it leaves', () => {
      const view = mount(<TestimonialCarousel testimonials={PEOPLE} />);

      advance(3000);
      hover(groupOf(view.container));
      advance(60_000);
      expect(visibleName(view.container)).toBe('Asha Rao');

      unhover(groupOf(view.container));
      advance(4999);
      expect(visibleName(view.container)).toBe('Asha Rao');

      advance(1);
      expect(visibleName(view.container)).toBe('Ben Okafor');
    });

    it('does not stop it for a finger: it never leaves', () => {
      const view = mount(<TestimonialCarousel testimonials={PEOPLE} />);

      hover(groupOf(view.container), 'touch');
      advance(5000);

      expect(visibleName(view.container)).toBe('Ben Okafor');
    });

    it('does not stop it for a pen either', () => {
      const view = mount(<TestimonialCarousel testimonials={PEOPLE} />);

      hover(groupOf(view.container), 'pen');
      advance(5000);

      expect(visibleName(view.container)).toBe('Ben Okafor');
    });

    it('stops it for a mouse over a part of it', () => {
      const view = mount(<TestimonialCarousel testimonials={PEOPLE} />);

      hover(buttonNamed(view.container, 'Next testimonial'));
      advance(20_000);

      expect(visibleName(view.container)).toBe('Asha Rao');
    });
  });

  describe('the focus', () => {
    it('stops it while the focus is in it', () => {
      const view = mount(<TestimonialCarousel testimonials={PEOPLE} />);

      focus(buttonNamed(view.container, 'Next testimonial'));
      advance(60_000);

      expect(visibleName(view.container)).toBe('Asha Rao');
    });

    it('goes on once the focus has left it', () => {
      const outside = document.createElement('button');

      document.body.append(outside);
      const view = mount(<TestimonialCarousel testimonials={PEOPLE} />);

      focus(buttonNamed(view.container, 'Next testimonial'));
      focus(outside);
      advance(5000);

      expect(visibleName(view.container)).toBe('Ben Okafor');
    });

    it('does not start the timer for a moment when the focus moves inside it', () => {
      const view = mount(<TestimonialCarousel testimonials={PEOPLE} />);

      focus(buttonNamed(view.container, 'Next testimonial'));
      const setTimer = vi.spyOn(window, 'setTimeout');

      focus(buttonNamed(view.container, 'Previous testimonial'));

      expect(setTimer).not.toHaveBeenCalled();
    });

    it('stays stopped while the focus moves from one part of it to another', () => {
      const view = mount(<TestimonialCarousel testimonials={PEOPLE} />);

      focus(buttonNamed(view.container, 'Next testimonial'));
      focus(buttonNamed(view.container, 'Previous testimonial'));
      advance(20_000);

      expect(visibleName(view.container)).toBe('Asha Rao');
    });
  });

  describe('the pause button', () => {
    it('stops it for good, also when the pointer and the focus have left', () => {
      const view = mount(<TestimonialCarousel testimonials={PEOPLE} />);

      click(buttonNamed(view.container, 'Pause the testimonials'));
      unhover(groupOf(view.container));
      advance(60_000);

      expect(visibleName(view.container)).toBe('Asha Rao');
      expect(buttonNamed(view.container, 'Play the testimonials')).toBeTruthy();
      expect(view.container.querySelector('[aria-label="Pause the testimonials"]')).toBeNull();
    });

    it('does not stop the buttons: it can still be moved by hand', () => {
      const view = mount(<TestimonialCarousel testimonials={PEOPLE} />);

      click(buttonNamed(view.container, 'Pause the testimonials'));
      click(buttonNamed(view.container, 'Next testimonial'));

      expect(visibleName(view.container)).toBe('Ben Okafor');
    });

    it('starts it again, also while the pointer is over it and the focus is in it', () => {
      const view = mount(<TestimonialCarousel testimonials={PEOPLE} />);

      hover(groupOf(view.container));
      focus(buttonNamed(view.container, 'Pause the testimonials'));
      click(buttonNamed(view.container, 'Pause the testimonials'));
      click(buttonNamed(view.container, 'Play the testimonials'));
      advance(5000);

      expect(visibleName(view.container)).toBe('Ben Okafor');
      expect(buttonNamed(view.container, 'Pause the testimonials')).toBeTruthy();
    });

    it('pauses it again after it was played', () => {
      const view = mount(<TestimonialCarousel testimonials={PEOPLE} />);

      click(buttonNamed(view.container, 'Pause the testimonials'));
      click(buttonNamed(view.container, 'Play the testimonials'));
      click(buttonNamed(view.container, 'Pause the testimonials'));
      advance(60_000);

      expect(visibleName(view.container)).toBe('Asha Rao');
    });

    it('shows the pause icon while it turns and the play icon once it is paused', () => {
      const view = mount(<TestimonialCarousel testimonials={PEOPLE} />);
      const pause = mount(<Icon icon="solar:pause-linear" />);
      const play = mount(<Icon icon="solar:play-linear" />);
      const bodyOf = (container: HTMLElement) =>
        required(container.querySelector('svg'), 'the icon').innerHTML;

      expect(bodyOf(buttonNamed(view.container, 'Pause the testimonials'))).toBe(
        bodyOf(pause.container),
      );

      click(buttonNamed(view.container, 'Pause the testimonials'));

      expect(bodyOf(buttonNamed(view.container, 'Play the testimonials'))).toBe(
        bodyOf(play.container),
      );
    });

    it('shows the icon of what it will do', () => {
      const view = mount(<TestimonialCarousel testimonials={PEOPLE} />);
      const before = buttonNamed(view.container, 'Pause the testimonials').innerHTML;

      click(buttonNamed(view.container, 'Pause the testimonials'));

      expect(buttonNamed(view.container, 'Play the testimonials').innerHTML).not.toBe(before);
    });
  });

  describe('when the person asked for less motion', () => {
    it('does not turn by itself, and has no pause button, but can be moved by hand', () => {
      stubReducedMotion(true);
      const view = mount(<TestimonialCarousel testimonials={PEOPLE} />);

      advance(60_000);

      expect(visibleName(view.container)).toBe('Asha Rao');
      expect(view.container.querySelector('[aria-label="Pause the testimonials"]')).toBeNull();
      expect(vi.getTimerCount()).toBe(0);

      click(buttonNamed(view.container, 'Next testimonial'));

      expect(visibleName(view.container)).toBe('Ben Okafor');
    });

    it('does not turn even when the play button was pressed before the setting came', () => {
      const view = mount(<TestimonialCarousel testimonials={PEOPLE} />);

      click(buttonNamed(view.container, 'Pause the testimonials'));
      click(buttonNamed(view.container, 'Play the testimonials'));
      stubReducedMotion(true);
      view.rerender(<TestimonialCarousel testimonials={PEOPLE} />);

      advance(60_000);

      expect(visibleName(view.container)).toBe('Asha Rao');
    });
  });

  // These lines are checked by the type check of the package (`npm run typecheck`), not by vitest.
  it('does not compile without testimonials, or a testimonial without a name and a quote', () => {
    const check = () => {
      // @ts-expect-error the testimonials are needed
      <TestimonialCarousel />;
      // @ts-expect-error a testimonial has a name and what was said
      <TestimonialCarousel testimonials={[{ name: 'A' }]} />;
      // @ts-expect-error the interval is a number of milliseconds
      <TestimonialCarousel testimonials={[]} interval="fast" />;
    };

    expect(check).toBeTypeOf('function');
  });
});
