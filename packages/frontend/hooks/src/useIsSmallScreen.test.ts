import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useIsSmallScreen } from './useIsSmallScreen.js';

// jsdom has no `window.matchMedia`, so each test installs a controllable one.
interface IFakeMediaQuery {
  query: string;
  matches: boolean;
  listeners: Set<(event: MediaQueryListEvent) => void>;
}

let mediaQueries: IFakeMediaQuery[] = [];
let matchesFor: (query: string) => boolean = () => false;

const installMatchMedia = () => {
  window.matchMedia = vi.fn((query: string) => {
    const fake: IFakeMediaQuery = { query, matches: matchesFor(query), listeners: new Set() };
    mediaQueries.push(fake);

    return {
      media: query,
      matches: fake.matches,
      addEventListener: (_type: string, listener: (event: MediaQueryListEvent) => void) => {
        fake.listeners.add(listener);
      },
      removeEventListener: (_type: string, listener: (event: MediaQueryListEvent) => void) => {
        fake.listeners.delete(listener);
      },
    } as unknown as MediaQueryList;
  });
};

/** Fires a `change` event on every live listener of the given query. */
const emitChange = (query: string, matches: boolean) => {
  for (const fake of mediaQueries.filter((item) => item.query === query)) {
    for (const listener of fake.listeners) listener({ matches } as MediaQueryListEvent);
  }
};

const liveListeners = (query: string) =>
  mediaQueries
    .filter((item) => item.query === query)
    .reduce((total, item) => total + item.listeners.size, 0);

describe('useIsSmallScreen', () => {
  beforeEach(() => {
    mediaQueries = [];
    matchesFor = () => false;
    installMatchMedia();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('queries (max-width: 1023px) by default', () => {
    renderHook(() => useIsSmallScreen());

    expect(mediaQueries.map((item) => item.query)).toContain('(max-width: 1023px)');
  });

  it('queries the width it is given', () => {
    renderHook(() => useIsSmallScreen(767));

    expect(mediaQueries.map((item) => item.query)).toContain('(max-width: 767px)');
  });

  it('returns the correct value on the very first render (no false-then-true flash)', () => {
    matchesFor = () => true;
    const rendered: boolean[] = [];

    renderHook(() => {
      const value = useIsSmallScreen();
      rendered.push(value);
      return value;
    });

    expect(rendered[0]).toBe(true);
    expect(rendered.every(Boolean)).toBe(true);
  });

  it('returns false when the screen is wider than the breakpoint', () => {
    const { result } = renderHook(() => useIsSmallScreen());

    expect(result.current).toBe(false);
  });

  it('follows the media query as the window crosses the breakpoint', () => {
    const { result } = renderHook(() => useIsSmallScreen(767));

    act(() => {
      emitChange('(max-width: 767px)', true);
    });
    expect(result.current).toBe(true);

    act(() => {
      emitChange('(max-width: 767px)', false);
    });
    expect(result.current).toBe(false);
  });

  it('removes its listener on unmount', () => {
    const { unmount } = renderHook(() => useIsSmallScreen(767));
    expect(liveListeners('(max-width: 767px)')).toBe(1);

    unmount();

    expect(liveListeners('(max-width: 767px)')).toBe(0);
  });

  it('moves its listener to the new query when the width changes', () => {
    const { result, rerender } = renderHook(({ width }) => useIsSmallScreen(width), {
      initialProps: { width: 767 },
    });

    rerender({ width: 1024 });

    expect(liveListeners('(max-width: 767px)')).toBe(0);
    expect(liveListeners('(max-width: 1024px)')).toBe(1);

    act(() => {
      emitChange('(max-width: 1024px)', true);
    });
    expect(result.current).toBe(true);
  });
});
