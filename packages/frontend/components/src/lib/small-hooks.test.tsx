// @vitest-environment jsdom
import { act } from 'react';
import { renderToString } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { renderHook, unmountAll } from '../test-utils/react.js';
import { scrollRowIntoView } from './scrollRowIntoView.js';
import { usePrefersReducedMotion } from './usePrefersReducedMotion.js';

type TListener = () => void;

const stubMatchMedia = (initial: boolean) => {
  const listeners = new Set<TListener>();
  let matches = initial;
  const queries: string[] = [];

  vi.stubGlobal(
    'matchMedia',
    vi.fn((query: string) => {
      queries.push(query);

      return {
        get matches() {
          return matches;
        },
        addEventListener: (_type: string, listener: TListener) => listeners.add(listener),
        removeEventListener: (_type: string, listener: TListener) => listeners.delete(listener),
      };
    }),
  );

  return {
    queries,
    listeners,
    change: (next: boolean) => {
      matches = next;
      act(() => {
        for (const listener of listeners) listener();
      });
    },
  };
};

describe('usePrefersReducedMotion', () => {
  afterEach(() => {
    unmountAll();
    vi.unstubAllGlobals();
  });

  it('is what the system says: no preference, or less motion', () => {
    stubMatchMedia(false);
    expect(renderHook(usePrefersReducedMotion).result.current).toBe(false);

    stubMatchMedia(true);
    expect(renderHook(usePrefersReducedMotion).result.current).toBe(true);
  });

  it('asks about less motion', () => {
    const media = stubMatchMedia(false);

    renderHook(usePrefersReducedMotion);

    expect(media.queries).toContain('(prefers-reduced-motion: reduce)');
  });

  it('follows the setting while the page is open', () => {
    const media = stubMatchMedia(false);
    const hook = renderHook(usePrefersReducedMotion);

    media.change(true);
    expect(hook.result.current).toBe(true);

    media.change(false);
    expect(hook.result.current).toBe(false);
  });

  it('stops listening when it is removed', () => {
    const media = stubMatchMedia(false);
    const hook = renderHook(usePrefersReducedMotion);

    expect(media.listeners.size).toBe(1);

    hook.unmount();

    expect(media.listeners.size).toBe(0);
  });

  it('listens once in StrictMode', () => {
    const media = stubMatchMedia(false);

    renderHook(usePrefersReducedMotion, { strict: true });

    expect(media.listeners.size).toBe(1);
  });

  it('is false where the browser has no matchMedia (a test environment)', () => {
    vi.stubGlobal('matchMedia', undefined);

    expect(renderHook(usePrefersReducedMotion).result.current).toBe(false);
  });

  it('is false on a server', () => {
    stubMatchMedia(true);
    const Probe = () => <span>{usePrefersReducedMotion() ? 'reduced' : 'normal'}</span>;

    expect(renderToString(<Probe />)).toContain('normal');
  });
});

describe('scrollRowIntoView', () => {
  const setup = ({
    scrollTop,
    clientHeight = 100,
    rowTop,
    rowHeight = 30,
  }: {
    scrollTop: number;
    clientHeight?: number;
    rowTop: number;
    rowHeight?: number;
  }) => {
    const list = document.createElement('ul');
    const row = document.createElement('li');

    Object.defineProperty(list, 'clientHeight', { value: clientHeight });
    Object.defineProperty(row, 'offsetTop', { value: rowTop });
    Object.defineProperty(row, 'offsetHeight', { value: rowHeight });
    list.scrollTop = scrollTop;

    return { list, row };
  };

  it('leaves the list alone when the row is in view', () => {
    const { list, row } = setup({ scrollTop: 50, rowTop: 80 });

    scrollRowIntoView(list, row);

    expect(list.scrollTop).toBe(50);
  });

  it('leaves it alone when the row fits exactly at either end', () => {
    const atTop = setup({ scrollTop: 50, rowTop: 50 });
    const atBottom = setup({ scrollTop: 50, rowTop: 120 });

    scrollRowIntoView(atTop.list, atTop.row);
    scrollRowIntoView(atBottom.list, atBottom.row);

    expect(atTop.list.scrollTop).toBe(50);
    expect(atBottom.list.scrollTop).toBe(50);
  });

  it('scrolls up to a row above, so that its top is the top of the list', () => {
    const { list, row } = setup({ scrollTop: 200, rowTop: 150 });

    scrollRowIntoView(list, row);

    expect(list.scrollTop).toBe(150);
  });

  it('scrolls down to a row below, so that its bottom is the bottom of the list', () => {
    const { list, row } = setup({ scrollTop: 0, rowTop: 300, rowHeight: 30 });

    scrollRowIntoView(list, row);

    expect(list.scrollTop).toBe(230);
  });

  it('does not move the page', () => {
    const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined);
    const { list, row } = setup({ scrollTop: 0, rowTop: 500 });

    scrollRowIntoView(list, row);

    expect(scrollTo).not.toHaveBeenCalled();
    scrollTo.mockRestore();
  });
});
