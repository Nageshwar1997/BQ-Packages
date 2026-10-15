// @vitest-environment jsdom
import { createRef } from 'react';
import { renderToString } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { installResizeObserver, required, setScrollMetrics } from '../test-utils/dom.js';
import { mount, unmountAll } from '../test-utils/react.js';
import { ScrollableGradientContainer } from './ScrollableGradientContainer.js';

let observers: ReturnType<typeof installResizeObserver>;

const parts = (container: HTMLElement) => {
  const outer = required(container.firstElementChild, 'the container');
  const scroller = required(
    [...outer.children].find((child) => !child.hasAttribute('aria-hidden')),
    'the scroller',
  ) as HTMLElement;

  return {
    outer,
    scroller,
    content: required(scroller.firstElementChild, 'the content') as HTMLElement,
    gradients: [...outer.children].filter((child) => child.getAttribute('aria-hidden') === 'true'),
  };
};

const scrollTo = (container: HTMLElement, metrics: Parameters<typeof setScrollMetrics>[1]) => {
  setScrollMetrics(parts(container).scroller, metrics);
  observers.triggerAll();
};

const HORIZONTAL_MIDDLE = { clientWidth: 300, scrollWidth: 900, scrollLeft: 300 };
const VERTICAL_START = { clientHeight: 100, scrollHeight: 500, scrollTop: 0 };

describe('ScrollableGradientContainer', () => {
  beforeEach(() => {
    observers = installResizeObserver();
  });

  afterEach(() => {
    unmountAll();
    vi.unstubAllGlobals();
  });

  describe('the fade', () => {
    it('shows none while everything fits', () => {
      const view = mount(
        <ScrollableGradientContainer direction="horizontal">x</ScrollableGradientContainer>,
      );
      scrollTo(view.container, { clientWidth: 300, scrollWidth: 300, scrollLeft: 0 });

      expect(parts(view.container).gradients).toHaveLength(0);
    });

    it('shows the edge that has more behind it, in both directions', () => {
      const horizontal = mount(
        <ScrollableGradientContainer direction="horizontal">x</ScrollableGradientContainer>,
      );
      scrollTo(horizontal.container, { clientWidth: 300, scrollWidth: 900, scrollLeft: 0 });
      expect(parts(horizontal.container).gradients[0]?.className).toContain('bg-linear-to-l'); // right

      const vertical = mount(
        <ScrollableGradientContainer direction="vertical">x</ScrollableGradientContainer>,
      );
      scrollTo(vertical.container, VERTICAL_START);
      expect(parts(vertical.container).gradients[0]?.className).toContain('bg-linear-to-t'); // bottom
    });

    it('shows both edges in the middle, and each one gets its class', () => {
      const view = mount(
        <ScrollableGradientContainer
          direction="horizontal"
          gradientClassNames={{ left: 'from-smoke-eerie', right: 'z-2' }}
        >
          x
        </ScrollableGradientContainer>,
      );
      scrollTo(view.container, HORIZONTAL_MIDDLE);
      const [left, right] = parts(view.container).gradients;

      expect(left.className).toContain('bg-linear-to-r');
      expect(left.className).toContain('from-smoke-eerie');
      expect(right.className).toContain('bg-linear-to-l');
      expect(right.className).toContain('z-2');
      expect(left.className).not.toContain('z-2');
    });

    it('goes when the end is reached', () => {
      const view = mount(
        <ScrollableGradientContainer direction="vertical">x</ScrollableGradientContainer>,
      );
      scrollTo(view.container, VERTICAL_START);
      expect(parts(view.container).gradients).toHaveLength(1);

      scrollTo(view.container, { clientHeight: 100, scrollHeight: 100, scrollTop: 0 });

      expect(parts(view.container).gradients).toHaveLength(0);
    });
  });

  describe('the content', () => {
    it('is shown', () => {
      const view = mount(
        <ScrollableGradientContainer direction="horizontal">
          <span>one</span>
          <span>two</span>
        </ScrollableGradientContainer>,
      );

      expect(parts(view.container).content.textContent).toBe('onetwo');
    });

    it('is centred while it fits and starts at the beginning once it scrolls', () => {
      const view = mount(
        <ScrollableGradientContainer direction="horizontal">x</ScrollableGradientContainer>,
      );
      expect(parts(view.container).content.className).toContain('items-center justify-center');

      scrollTo(view.container, HORIZONTAL_MIDDLE);

      expect(parts(view.container).content.className).toContain('items-start justify-start');
      expect(parts(view.container).content.className).not.toContain('items-center');
    });

    it('is a row for a horizontal box and a column for a vertical one', () => {
      const horizontal = mount(
        <ScrollableGradientContainer direction="horizontal">x</ScrollableGradientContainer>,
      );
      const vertical = mount(
        <ScrollableGradientContainer direction="vertical">x</ScrollableGradientContainer>,
      );

      expect(parts(horizontal.container).content.className).toContain('flex-row');
      expect(parts(horizontal.container).scroller.className).toContain('overflow-x-auto');
      expect(parts(vertical.container).content.className).toContain('flex-col');
      expect(parts(vertical.container).scroller.className).toContain('overflow-y-auto');
      expect(parts(vertical.container).scroller.className).not.toContain('overflow-x-auto');
    });
  });

  describe('with the keyboard', () => {
    it('is not a tab stop while there is nothing to scroll', () => {
      const view = mount(
        <ScrollableGradientContainer direction="vertical">x</ScrollableGradientContainer>,
      );

      expect(parts(view.container).scroller.hasAttribute('tabindex')).toBe(false);
    });

    it('is a tab stop once it scrolls, so the arrow keys can scroll it', () => {
      const view = mount(
        <ScrollableGradientContainer direction="vertical">x</ScrollableGradientContainer>,
      );
      scrollTo(view.container, VERTICAL_START);

      expect(parts(view.container).scroller.getAttribute('tabindex')).toBe('0');
    });

    it('has a name for assistive technology when it has a label, once it scrolls', () => {
      const view = mount(
        <ScrollableGradientContainer direction="horizontal" label="Product photos">
          x
        </ScrollableGradientContainer>,
      );
      expect(parts(view.container).scroller.getAttribute('role')).toBeNull();

      scrollTo(view.container, HORIZONTAL_MIDDLE);
      const { scroller } = parts(view.container);

      expect(scroller.getAttribute('role')).toBe('region');
      expect(scroller.getAttribute('aria-label')).toBe('Product photos');
    });

    it('is not a region without a label', () => {
      const view = mount(
        <ScrollableGradientContainer direction="horizontal">x</ScrollableGradientContainer>,
      );
      scrollTo(view.container, HORIZONTAL_MIDDLE);

      expect(parts(view.container).scroller.hasAttribute('role')).toBe(false);
    });

    it('has a focus ring for the keyboard, and scrolls without animation for a person who asked for less motion', () => {
      const view = mount(
        <ScrollableGradientContainer direction="horizontal">x</ScrollableGradientContainer>,
      );
      const classes = parts(view.container).scroller.className.split(/\s+/);

      expect(classes).toContain('focus-visible:outline-2');
      expect(classes).not.toContain('outline-hidden'); // it would hide the ring (see Stepper)
      expect(classes).toContain('motion-reduce:scroll-auto');
    });
  });

  describe('its classes', () => {
    it('go to the box that scrolls (className) and to the outer box (containerClassName)', () => {
      const view = mount(
        <ScrollableGradientContainer
          direction="horizontal"
          className="w-full"
          containerClassName="flex-1"
        >
          x
        </ScrollableGradientContainer>,
      );
      const { outer, scroller } = parts(view.container);

      expect(outer.className.split(/\s+/)).toContain('flex-1');
      expect(scroller.className.split(/\s+/)).toContain('w-full');
      expect(outer.className.split(/\s+/)).not.toContain('w-full w-full');
    });

    it('make the outer box as tall as its content for a row and as wide as it for a column', () => {
      const horizontal = mount(
        <ScrollableGradientContainer direction="horizontal">x</ScrollableGradientContainer>,
      );
      const vertical = mount(
        <ScrollableGradientContainer direction="vertical">x</ScrollableGradientContainer>,
      );

      expect(parts(horizontal.container).outer.className.split(/\s+/)).toEqual(
        expect.arrayContaining(['h-fit', 'w-full', 'flex-row']),
      );
      expect(parts(vertical.container).outer.className.split(/\s+/)).toEqual(
        expect.arrayContaining(['h-full', 'w-full', 'flex-col']),
      );
      // it takes the whole width of its parent (a dialog's content is centred in it), not the width of
      // its content
      expect(parts(vertical.container).outer.className.split(/\s+/)).not.toContain('w-fit');
    });
  });

  describe('in React', () => {
    it('watches its box, and lets go of it when it is removed', () => {
      const view = mount(
        <ScrollableGradientContainer direction="horizontal">x</ScrollableGradientContainer>,
      );
      expect(observers.active().length).toBeGreaterThan(0);

      view.unmount();

      expect(observers.active()).toHaveLength(0);
    });

    it('is the same in StrictMode', () => {
      const view = mount(
        <ScrollableGradientContainer direction="horizontal">x</ScrollableGradientContainer>,
        { strict: true },
      );
      scrollTo(view.container, HORIZONTAL_MIDDLE);

      expect(parts(view.container).gradients).toHaveLength(2);
      expect(observers.active()).toHaveLength(1);
    });

    it('shows no fade when it is rendered on a server, and the content is there', () => {
      const html = renderToString(
        <ScrollableGradientContainer direction="horizontal">hello</ScrollableGradientContainer>,
      );

      expect(html).toContain('hello');
      expect(html).not.toContain('aria-hidden');
    });
  });

  describe('scrollerRef', () => {
    it('gives the element that scrolls to a ref object, and takes it away when it is removed', () => {
      const scrollerRef = createRef<HTMLDivElement>();
      const view = mount(
        <ScrollableGradientContainer direction="horizontal" scrollerRef={scrollerRef}>
          x
        </ScrollableGradientContainer>,
      );

      expect(scrollerRef.current).toBe(parts(view.container).scroller);

      view.unmount();

      expect(scrollerRef.current).toBeNull();
    });

    it('gives it to a ref callback too', () => {
      const received: (HTMLElement | null)[] = [];
      const view = mount(
        <ScrollableGradientContainer
          direction="vertical"
          scrollerRef={(node) => {
            received.push(node);
          }}
        >
          x
        </ScrollableGradientContainer>,
      );

      expect(received).toContain(parts(view.container).scroller);
    });

    it('keeps the fade working when the app gives a ref', () => {
      const view = mount(
        <ScrollableGradientContainer
          direction="horizontal"
          scrollerRef={createRef<HTMLDivElement>()}
        >
          x
        </ScrollableGradientContainer>,
      );
      scrollTo(view.container, HORIZONTAL_MIDDLE);

      expect(parts(view.container).gradients).toHaveLength(2);
    });
  });

  // These lines are checked by the type check of the package (`npm run typecheck`), not by vitest.
  it('does not compile without a direction, or with one that does not exist', () => {
    const check = () => {
      // @ts-expect-error it has to know the way it scrolls
      <ScrollableGradientContainer>x</ScrollableGradientContainer>;
      // @ts-expect-error a row or a column
      <ScrollableGradientContainer direction="diagonal">x</ScrollableGradientContainer>;
      // @ts-expect-error the fades are on the four edges
      <ScrollableGradientContainer direction="vertical" gradientClassNames={{ middle: 'x' }}>
        x
      </ScrollableGradientContainer>;
    };

    expect(check).toBeTypeOf('function');
  });
});
