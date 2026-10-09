// @vitest-environment jsdom
import { fireEvent } from '@testing-library/react';
import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, type MockInstance, vi } from 'vitest';

import { TOOLTIP_ANIMATION_DURATION } from '../lib/constants.js';
import { mount, unmountAll } from '../test-utils/react.js';
import { Tooltip } from './Tooltip.js';

let rectSpy: MockInstance<() => DOMRect>;
let anchor = { top: 100, bottom: 140, left: 200, right: 300, width: 100, height: 40 };
// The size of the tooltip itself when it is not the size of the content (nothing is drawn here).
let tooltipSize: { width: number; height: number } | undefined;

const tooltipOnPage = () => document.body.querySelector<HTMLElement>('.fixed.z-9999');

const advance = (ms: number) => {
  act(() => {
    vi.advanceTimersByTime(ms);
  });
};

/** What the page shows: the wrapper around the content, and the content itself. */
const view = (props: Partial<Parameters<typeof Tooltip>[0]> = {}) => {
  const mounted = mount(
    <Tooltip title="Hello" description="Details" {...props}>
      <button type="button">Hover me</button>
    </Tooltip>,
  );
  const content = mounted.container.querySelector('button');

  if (!content?.parentElement) throw new Error('The tooltip did not render its content');

  return { ...mounted, content, wrapper: content.parentElement };
};

describe('Tooltip', () => {
  beforeEach(() => {
    anchor = { top: 100, bottom: 140, left: 200, right: 300, width: 100, height: 40 };
    tooltipSize = undefined;
    vi.useFakeTimers({
      toFake: ['setTimeout', 'clearTimeout', 'requestAnimationFrame', 'cancelAnimationFrame'],
    });
    rectSpy = vi
      .spyOn(HTMLElement.prototype, 'getBoundingClientRect')
      .mockImplementation(function (this: HTMLElement) {
        const isTooltip = this.getAttribute('role') === 'tooltip';

        return (isTooltip && tooltipSize ? { ...anchor, ...tooltipSize } : anchor) as DOMRect;
      });
  });

  afterEach(() => {
    unmountAll();
    vi.restoreAllMocks();
    vi.useRealTimers();
    document.body.replaceChildren();
  });

  it('shows nothing until the content is hovered', () => {
    view();

    expect(tooltipOnPage()).toBeNull();
  });

  describe('when it is not required', () => {
    const tree = (required: boolean) => (
      <Tooltip title="Hello" required={required}>
        <button type="button">Plain</button>
      </Tooltip>
    );

    it('shows only the content: its wrapper takes no room', () => {
      const mounted = mount(tree(false));

      expect(mounted.container.innerHTML).toBe(
        '<div class="contents"><button type="button">Plain</button></div>',
      );
    });

    it('never opens', () => {
      const mounted = mount(tree(false));
      const button = mounted.container.querySelector('button');

      if (!button?.parentElement) throw new Error('no content');

      fireEvent.mouseEnter(button.parentElement);
      fireEvent.focus(button);
      advance(1000);

      expect(tooltipOnPage()).toBeNull();
    });

    // `required` follows things like the size of the screen or a field being locked, so it does
    // change while the page is there; the content must not be created again when it does.
    it('keeps the very same content when `required` changes, so it keeps its state', () => {
      const mounted = mount(tree(true));
      const before = mounted.container.querySelector('button');

      mounted.rerender(tree(false));
      expect(mounted.container.querySelector('button')).toBe(before);

      mounted.rerender(tree(true));
      expect(mounted.container.querySelector('button')).toBe(before);
    });

    it('takes the tooltip away at once when it stops being required while it is open', () => {
      const mounted = mount(tree(true));
      const button = mounted.container.querySelector('button');

      if (!button?.parentElement) throw new Error('no content');

      fireEvent.mouseEnter(button.parentElement);
      advance(50);
      expect(tooltipOnPage()).not.toBeNull();

      mounted.rerender(tree(false));

      expect(tooltipOnPage()).toBeNull();
    });
  });

  it('opens on hover next to the content, in the body, and fades in', () => {
    const { wrapper } = view();

    fireEvent.mouseEnter(wrapper);

    const tooltip = tooltipOnPage();

    expect(tooltip?.parentElement).toBe(document.body);
    expect(tooltip?.textContent).toBe('HelloDetails');
    expect(tooltip?.className).toContain('invisible'); // it starts hidden, to be able to fade in

    advance(50); // two animation frames

    expect(tooltipOnPage()?.className).toContain('opacity-100');
    expect(tooltipOnPage()?.className).not.toContain('invisible');
  });

  it('has no description line without a description', () => {
    const { wrapper } = view({ description: undefined });

    fireEvent.mouseEnter(wrapper);

    expect(tooltipOnPage()?.textContent).toBe('Hello');
  });

  it('is placed from the position of the content, on the side that was asked for', () => {
    const { wrapper } = view({ placement: 'bottom' });

    fireEvent.mouseEnter(wrapper);
    advance(50);

    expect(tooltipOnPage()?.style.top).toBe('140px'); // under the content
    expect(tooltipOnPage()?.style.left).toBe('250px'); // in the middle of it
    expect(tooltipOnPage()?.style.transform).toContain('translate(-50%,');
    expect(tooltipOnPage()?.className).toContain('after:bottom-full'); // arrow
  });

  it('opens above the content by default', () => {
    const { wrapper } = view();

    fireEvent.mouseEnter(wrapper);

    expect(tooltipOnPage()?.style.top).toBe('100px');
    expect(tooltipOnPage()?.className).toContain('after:top-full');
  });

  it('closes when the mouse leaves: it fades out, then goes', () => {
    const { wrapper } = view();

    fireEvent.mouseEnter(wrapper);
    advance(50);
    fireEvent.mouseLeave(wrapper);

    expect(tooltipOnPage()?.className).toContain('invisible'); // fading out
    advance(TOOLTIP_ANIMATION_DURATION - 1);
    expect(tooltipOnPage()).not.toBeNull();
    advance(1);
    expect(tooltipOnPage()).toBeNull();
  });

  it('opens when the content gets the focus and closes when it loses it', () => {
    const { content } = view();

    fireEvent.focus(content);
    expect(tooltipOnPage()).not.toBeNull();

    fireEvent.blur(content);
    advance(TOOLTIP_ANIMATION_DURATION);
    expect(tooltipOnPage()).toBeNull();
  });

  it('stays open when the mouse comes back before it has closed', () => {
    const { wrapper } = view();

    fireEvent.mouseEnter(wrapper);
    advance(50);
    fireEvent.mouseLeave(wrapper);
    advance(TOOLTIP_ANIMATION_DURATION / 2);
    fireEvent.mouseEnter(wrapper);
    advance(TOOLTIP_ANIMATION_DURATION);

    expect(tooltipOnPage()).not.toBeNull();
  });

  it('follows the content when the window is resized or scrolled while it is open', () => {
    const { wrapper } = view();

    fireEvent.mouseEnter(wrapper);
    advance(50);
    expect(tooltipOnPage()?.style.top).toBe('100px');

    anchor = { ...anchor, top: 300 };
    fireEvent(window, new Event('resize'));
    advance(16); // it follows on the next frame
    expect(tooltipOnPage()?.style.top).toBe('300px');

    anchor = { ...anchor, top: 500 };
    fireEvent(document.body, new Event('scroll'));
    advance(16);
    expect(tooltipOnPage()?.style.top).toBe('500px');
  });

  it('follows the content at most once a frame, however many scroll events there are', () => {
    const { wrapper } = view();

    fireEvent.mouseEnter(wrapper);
    advance(50);
    rectSpy.mockClear();

    for (let event = 0; event < 10; event += 1) fireEvent(document.body, new Event('scroll'));
    advance(16);

    // one update measures the content and the tooltip
    expect(rectSpy).toHaveBeenCalledTimes(2);
  });

  it('cancels the frame it was waiting for when it is removed', () => {
    const requestFrame = vi.spyOn(window, 'requestAnimationFrame');
    const cancelFrame = vi.spyOn(window, 'cancelAnimationFrame');
    const { wrapper, unmount } = view();

    fireEvent.mouseEnter(wrapper);
    advance(50);
    requestFrame.mockClear();
    fireEvent(window, new Event('resize')); // asks for a frame to follow the content in
    const waiting = requestFrame.mock.results.at(-1)?.value as number | undefined;
    unmount();

    expect(waiting).toBeDefined();
    expect(cancelFrame).toHaveBeenCalledWith(waiting);
  });

  it('stops following the window once it is closed', () => {
    const { wrapper } = view();

    fireEvent.mouseEnter(wrapper);
    advance(50);
    fireEvent.mouseLeave(wrapper);
    advance(TOOLTIP_ANIMATION_DURATION);

    rectSpy.mockClear();

    fireEvent(window, new Event('resize'));

    expect(rectSpy).not.toHaveBeenCalled();
  });

  it('leaves nothing behind when it is removed while open', () => {
    const { wrapper, unmount } = view();

    fireEvent.mouseEnter(wrapper);
    unmount();
    advance(1000);

    expect(tooltipOnPage()).toBeNull();
  });

  // Two closes (the mouse leaves, then the focus does) used to leave the first timer running with
  // nobody holding it, and it closed a tooltip the mouse had come back to.
  it('stays open when the mouse comes back after it left and the focus left too', () => {
    const { wrapper } = view();

    fireEvent.mouseEnter(wrapper);
    advance(50);
    fireEvent.mouseLeave(wrapper);
    fireEvent.blur(wrapper);
    fireEvent.mouseEnter(wrapper);
    advance(TOOLTIP_ANIMATION_DURATION + 100);

    expect(tooltipOnPage()).not.toBeNull();
  });

  describe('for a screen reader', () => {
    it('is a tooltip, and describes the content while it is there', () => {
      const { wrapper, content } = view();

      expect(content.getAttribute('aria-describedby')).toBeNull();

      fireEvent.mouseEnter(wrapper);
      advance(50);

      const tooltip = tooltipOnPage();

      expect(tooltip?.getAttribute('role')).toBe('tooltip');
      expect(tooltip?.id).not.toBe('');
      expect(content.getAttribute('aria-describedby')).toBe(tooltip?.id);

      fireEvent.mouseLeave(wrapper);
      advance(TOOLTIP_ANIMATION_DURATION);

      expect(content.getAttribute('aria-describedby')).toBeNull();
    });

    it('keeps what the content was already described by', () => {
      const mounted = mount(
        <Tooltip title="Hello">
          <button type="button" aria-describedby="hint">
            Hover me
          </button>
        </Tooltip>,
      );
      const button = mounted.container.querySelector('button');

      if (!button?.parentElement) throw new Error('no content');

      fireEvent.mouseEnter(button.parentElement);

      expect(button.getAttribute('aria-describedby')).toBe(`hint ${tooltipOnPage()?.id ?? ''}`);

      fireEvent.mouseLeave(button.parentElement);
      advance(TOOLTIP_ANIMATION_DURATION);

      expect(button.getAttribute('aria-describedby')).toBe('hint');
    });

    it('gives each tooltip an id of its own', () => {
      const mounted = mount(
        <>
          <Tooltip title="One">
            <button type="button">One</button>
          </Tooltip>
          <Tooltip title="Two">
            <button type="button">Two</button>
          </Tooltip>
        </>,
      );

      for (const button of mounted.container.querySelectorAll('button')) {
        if (button.parentElement) fireEvent.mouseEnter(button.parentElement);
      }

      const ids = [...document.body.querySelectorAll('[role="tooltip"]')].map(({ id }) => id);

      expect(ids).toHaveLength(2);
      expect(new Set(ids).size).toBe(2);
    });

    it('closes on Escape, with the mouse still on the content', () => {
      const { wrapper } = view();

      fireEvent.mouseEnter(wrapper);
      advance(50);
      fireEvent.keyDown(document.body, { key: 'Escape' });

      expect(tooltipOnPage()?.className).toContain('invisible'); // fading out
      advance(TOOLTIP_ANIMATION_DURATION);
      expect(tooltipOnPage()).toBeNull();
    });

    it('ignores the other keys, and Escape when it is closed', () => {
      const { wrapper } = view();

      fireEvent.keyDown(document.body, { key: 'Escape' }); // closed: nothing to close
      fireEvent.mouseEnter(wrapper);
      advance(50);
      fireEvent.keyDown(document.body, { key: 'Enter' });
      advance(TOOLTIP_ANIMATION_DURATION);

      expect(tooltipOnPage()).not.toBeNull();
    });
  });

  describe('near the edge of the window', () => {
    // The tooltip is as big as the content here (the page is not drawn in the tests): 100 x 40,
    // in a window of 1024 x 768. It keeps 8px from the edge and 15px from the content.
    it('opens below the content when there is no room above it', () => {
      anchor = { top: 20, bottom: 60, left: 200, right: 300, width: 100, height: 40 };
      const { wrapper } = view({ placement: 'top' });

      fireEvent.mouseEnter(wrapper);
      advance(50);

      expect(tooltipOnPage()?.style.top).toBe('60px'); // under the content
      expect(tooltipOnPage()?.className).toContain('after:bottom-full'); // the arrow follows
      expect(tooltipOnPage()?.style.transform).toContain('translate(-50%, 15px)');
    });

    it('opens above the content when there is no room below it', () => {
      anchor = { top: 700, bottom: 740, left: 200, right: 300, width: 100, height: 40 };
      const { wrapper } = view({ placement: 'bottom' });

      fireEvent.mouseEnter(wrapper);
      advance(50);

      expect(tooltipOnPage()?.style.top).toBe('700px');
      expect(tooltipOnPage()?.className).toContain('after:top-full');
    });

    it('opens on the right when there is no room on the left', () => {
      anchor = { top: 100, bottom: 140, left: 10, right: 60, width: 50, height: 40 };
      const { wrapper } = view({ placement: 'left' });

      fireEvent.mouseEnter(wrapper);
      advance(50);

      expect(tooltipOnPage()?.style.left).toBe('60px');
      expect(tooltipOnPage()?.className).toContain('after:right-full');
    });

    it('is pushed in, with the arrow still pointing at the content, when it would leave the window', () => {
      anchor = { top: 100, bottom: 140, left: 0, right: 20, width: 20, height: 40 };
      tooltipSize = { width: 100, height: 40 };
      const { wrapper } = view();

      fireEvent.mouseEnter(wrapper);
      advance(50);

      // centred on the content it would start at -40: it starts at 8, so it moves 48 to the right
      expect(tooltipOnPage()?.style.left).toBe('58px');
      // the arrow goes back, but stays 16px inside the tooltip (100 / 2 - 16 = 34)
      expect(tooltipOnPage()?.style.getPropertyValue('--tooltip-arrow-shift')).toBe('-34px');
    });

    it('goes back to where it was asked to open when the window is scrolled back', () => {
      anchor = { top: 20, bottom: 60, left: 200, right: 300, width: 100, height: 40 };
      const { wrapper } = view({ placement: 'top' });

      fireEvent.mouseEnter(wrapper);
      advance(50);
      expect(tooltipOnPage()?.className).toContain('after:bottom-full');

      anchor = { top: 400, bottom: 440, left: 200, right: 300, width: 100, height: 40 };
      fireEvent(window, new Event('scroll'));
      advance(16);

      expect(tooltipOnPage()?.style.top).toBe('400px');
      expect(tooltipOnPage()?.className).toContain('after:top-full');
    });

    it('does not move the arrow when the tooltip is in the middle of the window', () => {
      const { wrapper } = view();

      fireEvent.mouseEnter(wrapper);
      advance(50);

      expect(tooltipOnPage()?.style.getPropertyValue('--tooltip-arrow-shift')).toBe('0px');
    });
  });

  it('adds the classes it is given to the tooltip and to its container', () => {
    const { wrapper } = view({ className: 'my-tooltip', containerClassName: 'my-container' });

    fireEvent.mouseEnter(wrapper);

    expect(tooltipOnPage()?.className).toContain('my-tooltip');
    expect(wrapper.className).toContain('my-container');
  });
});
