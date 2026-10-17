// @vitest-environment jsdom
import { act, type RefObject } from 'react';
import { afterEach, beforeEach, describe, expect, it, type Mock, vi } from 'vitest';

import { renderHook, unmountAll } from '../../test-utils/react.js';
import useFullscreen from './useFullscreen.js';

let fullscreenElement: Element | null = null;
// the mocks of the browser's methods are kept here, so the checks do not read a method off the DOM
let exit: Mock<() => Promise<void>> = vi.fn(() => Promise.resolve());
const requestOf = new WeakMap<Element, Mock<() => Promise<void>>>();

const setSupport = (enabled: boolean) => {
  Object.defineProperty(document, 'fullscreenEnabled', { configurable: true, value: enabled });
};

const makeTarget = (request?: () => Promise<void>) => {
  const target = document.createElement('div');
  const requested = vi.fn(
    request ??
      (() => {
        fullscreenElement = target;
        document.dispatchEvent(new Event('fullscreenchange'));

        return Promise.resolve();
      }),
  );

  target.requestFullscreen = requested;
  requestOf.set(target, requested);

  return target;
};

const refTo = (element: HTMLElement | null): RefObject<HTMLElement | null> => ({
  current: element,
});

beforeEach(() => {
  fullscreenElement = null;
  setSupport(true);
  Object.defineProperty(document, 'fullscreenElement', {
    configurable: true,
    get: () => fullscreenElement,
  });
  exit = vi.fn(() => {
    fullscreenElement = null;
    document.dispatchEvent(new Event('fullscreenchange'));

    return Promise.resolve();
  });
  document.exitFullscreen = exit;
});

afterEach(() => {
  unmountAll();
});

describe('useFullscreen', () => {
  it('is supported where the browser lets an element go full screen, and not where it does not', () => {
    setSupport(true);
    expect(renderHook(() => useFullscreen(refTo(makeTarget()))).result.current.isSupported).toBe(
      true,
    );

    setSupport(false);
    expect(renderHook(() => useFullscreen(refTo(makeTarget()))).result.current.isSupported).toBe(
      false,
    );
  });

  it('starts as not full screen', () => {
    const view = renderHook(() => useFullscreen(refTo(makeTarget())));

    expect(view.result.current.isFullscreen).toBe(false);
  });

  it('asks the browser to take its element (not the page) full screen', async () => {
    const target = makeTarget();
    const view = renderHook(() => useFullscreen(refTo(target)));

    await act(async () => {
      view.result.current.toggle();
      await Promise.resolve();
    });

    expect(requestOf.get(target)).toHaveBeenCalledTimes(1);
    expect(view.result.current.isFullscreen).toBe(true);
  });

  it('leaves full screen when it is pressed again', async () => {
    const target = makeTarget();
    const view = renderHook(() => useFullscreen(refTo(target)));

    await act(async () => {
      view.result.current.toggle();
      await Promise.resolve();
    });
    await act(async () => {
      view.result.current.toggle();
      await Promise.resolve();
    });

    expect(exit).toHaveBeenCalledTimes(1);
    expect(requestOf.get(target)).toHaveBeenCalledTimes(1);
    expect(view.result.current.isFullscreen).toBe(false);
  });

  it('follows the browser, not its own flag: Escape or the exit gesture of the browser leave it', async () => {
    const target = makeTarget();
    const view = renderHook(() => useFullscreen(refTo(target)));

    await act(async () => {
      view.result.current.toggle();
      await Promise.resolve();
    });
    expect(view.result.current.isFullscreen).toBe(true);

    act(() => {
      fullscreenElement = null;
      document.dispatchEvent(new Event('fullscreenchange'));
    });

    expect(view.result.current.isFullscreen).toBe(false);
  });

  it('is not "full screen" when it is another element that is', () => {
    const view = renderHook(() => useFullscreen(refTo(makeTarget())));

    act(() => {
      fullscreenElement = document.createElement('video');
      document.dispatchEvent(new Event('fullscreenchange'));
    });

    expect(view.result.current.isFullscreen).toBe(false);
  });

  it('is not "full screen" for the browser leaving full screen while it has no element (nothing equals nothing)', () => {
    const view = renderHook(() => useFullscreen(refTo(null)));

    act(() => {
      document.dispatchEvent(new Event('fullscreenchange'));
    });

    expect(view.result.current.isFullscreen).toBe(false);
  });

  it('stops saying it is supported when the browser refuses (it claimed support, and does not deliver)', async () => {
    const target = makeTarget(() => Promise.reject(new Error('not allowed')));
    const view = renderHook(() => useFullscreen(refTo(target)));

    expect(view.result.current.isSupported).toBe(true);

    await act(async () => {
      view.result.current.toggle();
      await Promise.resolve();
    });

    expect(view.result.current.isSupported).toBe(false);
    expect(view.result.current.isFullscreen).toBe(false);
  });

  it('does nothing without an element', () => {
    const view = renderHook(() => useFullscreen(refTo(null)));

    act(() => {
      view.result.current.toggle();
    });

    expect(exit).not.toHaveBeenCalled();
  });

  it('stops listening to the browser when it is removed', () => {
    const remove = vi.spyOn(document, 'removeEventListener');
    const view = renderHook(() => useFullscreen(refTo(makeTarget())));

    view.unmount();

    expect(remove).toHaveBeenCalledWith('fullscreenchange', expect.any(Function));
  });
});
