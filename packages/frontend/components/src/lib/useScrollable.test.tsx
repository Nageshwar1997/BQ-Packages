// @vitest-environment jsdom
import { act, useLayoutEffect } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { installResizeObserver, setScrollMetrics } from '../test-utils/dom.js';
import { mount, unmountAll } from '../test-utils/react.js';
import { type TScrollDirection, type TScrollEdges, useScrollable } from './useScrollable.js';

let latest: TScrollEdges = {};
let renders = 0;

const Probe = ({ direction }: { direction: TScrollDirection }) => {
  const { ref, edges } = useScrollable<HTMLDivElement>(direction);

  // what was rendered last, for the tests to look at
  useLayoutEffect(() => {
    latest = edges;
    renders += 1;
  });

  return (
    <div ref={ref} data-testid="scroller">
      <div>content</div>
    </div>
  );
};

const scroller = (container: HTMLElement) => {
  const element = container.querySelector<HTMLElement>('[data-testid="scroller"]');

  if (!element) throw new Error('the scroller is not on the page');

  return element;
};

const scrollTo = (element: HTMLElement, metrics: Parameters<typeof setScrollMetrics>[1]) => {
  setScrollMetrics(element, metrics);
  act(() => {
    element.dispatchEvent(new Event('scroll'));
  });
};

describe('useScrollable', () => {
  let observers: ReturnType<typeof installResizeObserver>;

  beforeEach(() => {
    latest = {};
    renders = 0;
    observers = installResizeObserver();
  });

  afterEach(() => {
    unmountAll();
    vi.unstubAllGlobals();
  });

  describe('horizontally', () => {
    it('shows no edge when everything fits', () => {
      const view = mount(<Probe direction="horizontal" />);
      setScrollMetrics(scroller(view.container), {
        clientWidth: 300,
        scrollWidth: 300,
        scrollLeft: 0,
      });
      observers.triggerAll();

      expect(latest).toEqual({});
    });

    it('shows the right edge at the start of something that is wider', () => {
      const view = mount(<Probe direction="horizontal" />);
      setScrollMetrics(scroller(view.container), {
        clientWidth: 300,
        scrollWidth: 900,
        scrollLeft: 0,
      });
      observers.triggerAll();

      expect(latest).toEqual({ right: true });
    });

    it('shows both edges in the middle', () => {
      const view = mount(<Probe direction="horizontal" />);

      scrollTo(scroller(view.container), { clientWidth: 300, scrollWidth: 900, scrollLeft: 300 });

      expect(latest).toEqual({ left: true, right: true });
    });

    it('shows the left edge at the end', () => {
      const view = mount(<Probe direction="horizontal" />);

      scrollTo(scroller(view.container), { clientWidth: 300, scrollWidth: 900, scrollLeft: 600 });

      expect(latest).toEqual({ left: true });
    });

    it('does not count a gap of a few pixels (zoom, scaling) as more to scroll', () => {
      const view = mount(<Probe direction="horizontal" />);

      scrollTo(scroller(view.container), { clientWidth: 300, scrollWidth: 303, scrollLeft: 0 });
      expect(latest).toEqual({});

      scrollTo(scroller(view.container), { clientWidth: 300, scrollWidth: 900, scrollLeft: 597 });
      expect(latest).toEqual({ left: true });
    });

    it('never reports a vertical edge', () => {
      const view = mount(<Probe direction="horizontal" />);

      scrollTo(scroller(view.container), {
        clientWidth: 300,
        scrollWidth: 900,
        scrollLeft: 300,
        clientHeight: 100,
        scrollHeight: 900,
        scrollTop: 300,
      });

      expect(latest).toEqual({ left: true, right: true });
    });
  });

  describe('vertically', () => {
    it('shows the bottom edge at the top, both in the middle, the top at the end', () => {
      const view = mount(<Probe direction="vertical" />);

      scrollTo(scroller(view.container), { clientHeight: 100, scrollHeight: 500, scrollTop: 0 });
      expect(latest).toEqual({ bottom: true });

      scrollTo(scroller(view.container), { clientHeight: 100, scrollHeight: 500, scrollTop: 200 });
      expect(latest).toEqual({ top: true, bottom: true });

      scrollTo(scroller(view.container), { clientHeight: 100, scrollHeight: 500, scrollTop: 400 });
      expect(latest).toEqual({ top: true });
    });

    it('never reports a horizontal edge', () => {
      const view = mount(<Probe direction="vertical" />);

      scrollTo(scroller(view.container), {
        clientHeight: 100,
        scrollHeight: 500,
        scrollTop: 200,
        clientWidth: 100,
        scrollWidth: 900,
        scrollLeft: 300,
      });

      expect(latest).toEqual({ top: true, bottom: true });
    });
  });

  describe('when the size changes', () => {
    it('follows the element and its content: a list that grows', () => {
      const view = mount(<Probe direction="vertical" />);
      const element = scroller(view.container);
      setScrollMetrics(element, { clientHeight: 100, scrollHeight: 100, scrollTop: 0 });
      observers.triggerAll();
      expect(latest).toEqual({});

      setScrollMetrics(element, { scrollHeight: 400 });
      observers.triggerAll();

      expect(latest).toEqual({ bottom: true });
    });

    it('watches the element and its first child', () => {
      const view = mount(<Probe direction="vertical" />);
      const watched = observers.active().flatMap((observer) => observer.observed);

      expect(watched).toContain(scroller(view.container));
      expect(watched).toContain(scroller(view.container).firstElementChild);
    });

    it('renders only when an edge changes, not at every scroll event', () => {
      const view = mount(<Probe direction="vertical" />);
      const element = scroller(view.container);
      scrollTo(element, { clientHeight: 100, scrollHeight: 500, scrollTop: 10 });
      const after = renders;

      for (const top of [20, 30, 40, 50, 60]) {
        scrollTo(element, { clientHeight: 100, scrollHeight: 500, scrollTop: top });
      }

      expect(renders).toBe(after);
    });
  });

  describe('in React', () => {
    it('starts with no edge, as a server does', () => {
      mount(<Probe direction="horizontal" />);

      expect(renders).toBeGreaterThan(0);
      expect(latest).toEqual({});
    });

    it('follows a change of direction', () => {
      const view = mount(<Probe direction="horizontal" />);
      const element = scroller(view.container);
      setScrollMetrics(element, {
        clientWidth: 100,
        scrollWidth: 500,
        scrollLeft: 0,
        clientHeight: 100,
        scrollHeight: 500,
        scrollTop: 0,
      });
      observers.triggerAll();
      expect(latest).toEqual({ right: true });

      view.rerender(<Probe direction="vertical" />);

      expect(latest).toEqual({ bottom: true });
    });

    it('leaves nothing behind when it is removed', () => {
      const remove = vi.spyOn(HTMLElement.prototype, 'removeEventListener');
      const view = mount(<Probe direction="horizontal" />);

      view.unmount();

      expect(observers.active()).toHaveLength(0);
      expect(remove.mock.calls.map(([type]) => type)).toContain('scroll');
      remove.mockRestore();
    });

    it('is the same in StrictMode, with one observer left', () => {
      const view = mount(<Probe direction="horizontal" />, { strict: true });

      scrollTo(scroller(view.container), { clientWidth: 300, scrollWidth: 900, scrollLeft: 300 });

      expect(latest).toEqual({ left: true, right: true });
      expect(observers.active()).toHaveLength(1);
    });
  });
});
