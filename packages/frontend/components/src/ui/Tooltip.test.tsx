// @vitest-environment jsdom
import { fireEvent } from '@testing-library/react';
import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, type MockInstance, vi } from 'vitest';

import { TOOLTIP_ANIMATION_DURATION } from '../lib/constants.js';
import { mount, unmountAll } from '../test-utils/react.js';
import { Tooltip } from './Tooltip.js';

let rectSpy: MockInstance<() => DOMRect>;
let anchor = { top: 100, bottom: 140, left: 200, right: 300, width: 100, height: 40 };

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
    vi.useFakeTimers({
      toFake: ['setTimeout', 'clearTimeout', 'requestAnimationFrame', 'cancelAnimationFrame'],
    });
    rectSpy = vi
      .spyOn(HTMLElement.prototype, 'getBoundingClientRect')
      .mockImplementation(() => anchor as DOMRect);
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

  it('renders only the content when it is not required', () => {
    const mounted = mount(
      <Tooltip title="Hello" required={false}>
        <button type="button">Plain</button>
      </Tooltip>,
    );

    expect(mounted.container.innerHTML).toBe('<button type="button">Plain</button>');
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
    expect(tooltipOnPage()?.style.top).toBe('300px');

    anchor = { ...anchor, top: 500 };
    fireEvent(document.body, new Event('scroll'));
    expect(tooltipOnPage()?.style.top).toBe('500px');
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

  it('adds the classes it is given to the tooltip and to its container', () => {
    const { wrapper } = view({ className: 'my-tooltip', containerClassName: 'my-container' });

    fireEvent.mouseEnter(wrapper);

    expect(tooltipOnPage()?.className).toContain('my-tooltip');
    expect(wrapper.className).toContain('my-container');
  });
});
