// @vitest-environment jsdom
import { act, type RefObject } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { required, setRect } from '../test-utils/dom.js';
import { renderHook, unmountAll } from '../test-utils/react.js';
import type { TDropdownPlacement } from './dropdown-position.js';
import { useAnchoredBox } from './useAnchoredBox.js';

const anchor = (rect: Parameters<typeof setRect>[1]) => {
  const element = document.createElement('div');

  setRect(element, rect);

  return { current: element } satisfies RefObject<HTMLElement | null>;
};

describe('useAnchoredBox', () => {
  beforeEach(() => {
    window.innerHeight = 800;
  });

  afterEach(() => {
    unmountAll();
    vi.restoreAllMocks();
  });

  const render = (
    ref: RefObject<HTMLElement | null>,
    options: { isOpen?: boolean; position?: TDropdownPlacement; needed?: number } = {},
  ) =>
    renderHook(() =>
      useAnchoredBox({
        isOpen: options.isOpen ?? true,
        anchorRef: ref,
        position: options.position ?? 'bottom',
        needed: options.needed ?? 300,
      }),
    );

  it('is null while it is closed, and does not listen to the page', () => {
    const add = vi.spyOn(window, 'addEventListener');
    const hook = render(anchor({ top: 100, bottom: 140, left: 10, width: 200 }), { isOpen: false });

    expect(hook.result.current).toBeNull();
    expect(add.mock.calls.filter(([type]) => type === 'scroll' || type === 'resize')).toHaveLength(
      0,
    );
  });

  it('is where the anchor is, under it, when there is room', () => {
    const hook = render(anchor({ top: 100, bottom: 140, left: 10, width: 200 }));

    expect(hook.result.current?.placement).toBe('bottom');
    expect(hook.result.current?.rect).toMatchObject({
      top: 100,
      bottom: 140,
      left: 10,
      width: 200,
    });
  });

  it('is over the anchor when it is asked to be and there is room', () => {
    const hook = render(anchor({ top: 500, bottom: 540, left: 10, width: 200 }), {
      position: 'top',
    });

    expect(hook.result.current?.placement).toBe('top');
  });

  it('is on the other side when there is no room on the one asked for', () => {
    const hook = render(anchor({ top: 600, bottom: 700, left: 10, width: 200 }), { needed: 300 });

    expect(hook.result.current?.placement).toBe('top');
  });

  it('measures again when the page scrolls, also when a part of it does', () => {
    const ref = anchor({ top: 100, bottom: 140, left: 10, width: 200 });
    const hook = render(ref);

    setRect(required(ref.current, 'the anchor'), { top: 60, bottom: 100, left: 10, width: 200 });
    act(() => {
      window.dispatchEvent(new Event('scroll'));
    });

    expect(hook.result.current?.rect.top).toBe(60);

    setRect(required(ref.current, 'the anchor'), { top: 20, bottom: 60, left: 10, width: 200 });
    act(() => {
      document.body.dispatchEvent(new Event('scroll'));
    });

    // a scroll of an element does not bubble, but the listener is on the capture phase: it is heard
    expect(hook.result.current?.rect.top).toBe(20);
  });

  it('measures again when the window is resized', () => {
    const ref = anchor({ top: 100, bottom: 140, left: 10, width: 200 });
    const hook = render(ref);

    setRect(required(ref.current, 'the anchor'), { top: 100, bottom: 140, left: 10, width: 320 });
    act(() => {
      window.dispatchEvent(new Event('resize'));
    });

    expect(hook.result.current?.rect.width).toBe(320);
  });

  it('measures when it opens, and again when the side or the height changes', () => {
    const ref = anchor({ top: 500, bottom: 540, left: 10, width: 200 });
    const options = { isOpen: false, position: 'bottom' as TDropdownPlacement, needed: 100 };
    const hook = renderHook(() => useAnchoredBox({ ...options, anchorRef: ref }));

    expect(hook.result.current).toBeNull();

    options.isOpen = true;
    hook.rerender();
    expect(hook.result.current?.placement).toBe('bottom');

    options.position = 'top';
    hook.rerender();
    expect(hook.result.current?.placement).toBe('top');

    // 260 under the anchor is not enough for a box of 400, and 492 above is
    options.position = 'bottom';
    options.needed = 400;
    hook.rerender();
    expect(hook.result.current?.placement).toBe('top');
  });

  it('stops listening when it closes and when it is removed', () => {
    const remove = vi.spyOn(window, 'removeEventListener');
    const hook = render(anchor({ top: 100, bottom: 140, left: 10, width: 200 }));

    hook.unmount();

    expect(remove.mock.calls.filter(([type]) => type === 'scroll')).toHaveLength(1);
    expect(remove.mock.calls.filter(([type]) => type === 'resize')).toHaveLength(1);
  });

  it('does nothing while the anchor is not there', () => {
    const hook = render({ current: null });

    expect(hook.result.current).toBeNull();
  });

  it('listens once in StrictMode', () => {
    const add = vi.spyOn(window, 'addEventListener');
    const remove = vi.spyOn(window, 'removeEventListener');
    const ref = anchor({ top: 0, bottom: 10, left: 0, width: 10 });
    const hook = renderHook(
      () =>
        useAnchoredBox({
          isOpen: true,
          anchorRef: ref,
          position: 'bottom',
          needed: 100,
        }),
      { strict: true },
    );
    const scrolls = () =>
      add.mock.calls.filter(([type]) => type === 'scroll').length -
      remove.mock.calls.filter(([type]) => type === 'scroll').length;

    expect(scrolls()).toBeGreaterThanOrEqual(1);

    hook.unmount();

    expect(scrolls()).toBe(0);
  });
});
