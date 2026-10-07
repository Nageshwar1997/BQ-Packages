import { act, render, renderHook } from '@testing-library/react';
import { StrictMode } from 'react';
import { renderToString } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { useIsSmallScreen } from './useIsSmallScreen.js';

// jsdom has no `window.matchMedia`. This stand-in behaves like the real one: `matches` always
// reflects the *current* state of the query, and `change` listeners fire when it flips.
type TListener = () => void;

const originalDescriptor = Object.getOwnPropertyDescriptor(window, 'matchMedia');

const currentMatches = new Map<string, boolean>();
const listeners = new Map<string, Set<TListener>>();
let queriesAsked: string[] = [];
let addCalls = 0;

const installMatchMedia = () => {
  const matchMedia = (query: string) => {
    queriesAsked.push(query);

    return {
      media: query,
      get matches() {
        return currentMatches.get(query) ?? false;
      },
      addEventListener: (_type: string, listener: TListener) => {
        addCalls += 1;
        const set = listeners.get(query) ?? new Set<TListener>();
        set.add(listener);
        listeners.set(query, set);
      },
      removeEventListener: (_type: string, listener: TListener) => {
        listeners.get(query)?.delete(listener);
      },
    };
  };

  Object.defineProperty(window, 'matchMedia', {
    value: matchMedia,
    configurable: true,
    writable: true,
  });
};

const restoreMatchMedia = () => {
  if (originalDescriptor) Object.defineProperty(window, 'matchMedia', originalDescriptor);
  else Reflect.deleteProperty(window, 'matchMedia');
};

/** Flips a query, like the browser does when the window is resized across the breakpoint. */
const setMatches = (query: string, matches: boolean) => {
  currentMatches.set(query, matches);
  for (const listener of listeners.get(query) ?? []) listener();
};

const liveListeners = (query: string) => listeners.get(query)?.size ?? 0;

describe('useIsSmallScreen', () => {
  beforeEach(() => {
    currentMatches.clear();
    listeners.clear();
    queriesAsked = [];
    addCalls = 0;
    installMatchMedia();
  });

  afterEach(() => {
    // Put back what jsdom had (nothing), so other test files are unaffected.
    restoreMatchMedia();
  });

  it('queries (max-width: 1023px) by default', () => {
    renderHook(() => useIsSmallScreen());

    expect(queriesAsked).toContain('(max-width: 1023px)');
  });

  it('queries the width it is given', () => {
    renderHook(() => useIsSmallScreen(767));

    expect(queriesAsked).toContain('(max-width: 767px)');
  });

  it('returns the correct value on the very first render (no false-then-true flash)', () => {
    currentMatches.set('(max-width: 1023px)', true);
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
      setMatches('(max-width: 767px)', true);
    });
    expect(result.current).toBe(true);

    act(() => {
      setMatches('(max-width: 767px)', false);
    });
    expect(result.current).toBe(false);
  });

  it('updates every component that uses the same breakpoint', () => {
    const first = renderHook(() => useIsSmallScreen(767));
    const second = renderHook(() => useIsSmallScreen(767));

    act(() => {
      setMatches('(max-width: 767px)', true);
    });

    expect(first.result.current).toBe(true);
    expect(second.result.current).toBe(true);
  });

  it('subscribes once per mount, not once per render', () => {
    const { rerender } = renderHook(() => useIsSmallScreen(767));

    rerender();
    rerender();
    rerender();

    expect(addCalls).toBe(1);
    expect(liveListeners('(max-width: 767px)')).toBe(1);
  });

  it('removes its listener on unmount', () => {
    const { unmount } = renderHook(() => useIsSmallScreen(767));
    expect(liveListeners('(max-width: 767px)')).toBe(1);

    unmount();

    expect(liveListeners('(max-width: 767px)')).toBe(0);
  });

  it('returns the value for the new width right away when the width argument changes', () => {
    currentMatches.set('(max-width: 1024px)', true); // 767 does not match, 1024 does
    const { result, rerender } = renderHook(({ width }) => useIsSmallScreen(width), {
      initialProps: { width: 767 },
    });
    expect(result.current).toBe(false);

    rerender({ width: 1024 });

    expect(result.current).toBe(true);
  });

  it('moves its listener to the new query when the width changes and follows it', () => {
    const { result, rerender } = renderHook(({ width }) => useIsSmallScreen(width), {
      initialProps: { width: 767 },
    });

    rerender({ width: 1024 });

    expect(liveListeners('(max-width: 767px)')).toBe(0);
    expect(liveListeners('(max-width: 1024px)')).toBe(1);

    act(() => {
      setMatches('(max-width: 1024px)', true);
    });
    expect(result.current).toBe(true);
  });

  it('keeps exactly one live listener under React StrictMode', () => {
    const { unmount } = renderHook(() => useIsSmallScreen(767), { wrapper: StrictMode });

    expect(liveListeners('(max-width: 767px)')).toBe(1);

    unmount();
    expect(liveListeners('(max-width: 767px)')).toBe(0);
  });

  describe('server rendering', () => {
    const Probe = () => <span>{String(useIsSmallScreen(767))}</span>;

    it('does not touch window.matchMedia and renders false', () => {
      // No matchMedia at all, like on a real server.
      Reflect.deleteProperty(window, 'matchMedia');

      expect(renderToString(<Probe />)).toContain('false');
    });

    it('renders false even when the browser would match (the real value arrives on the client)', () => {
      currentMatches.set('(max-width: 767px)', true);

      expect(renderToString(<Probe />)).toContain('false');
    });

    it('client render of the same component shows the real value', () => {
      currentMatches.set('(max-width: 767px)', true);

      const { container } = render(<Probe />);

      expect(container.textContent).toBe('true');
    });
  });
});
