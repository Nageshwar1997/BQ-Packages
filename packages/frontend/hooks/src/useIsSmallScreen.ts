import { useCallback, useMemo, useSyncExternalStore } from 'react';

export interface IUseIsSmallScreenOptions {
  /**
   * What to return on the server and while the page is being hydrated, where there is no window to
   * ask. Pass what you know about the visitor (a user-agent or client-hint guess) to avoid a layout
   * flash. The real value replaces it right after hydration, and a plain client render never uses it.
   * @default false
   */
  serverValue?: boolean;
}

/**
 * Whether the viewport is at most `width` px wide (`(max-width: ${width}px)`), kept in sync with
 * the window as it is resized.
 *
 * - The first client render already has the right value (no `false` then `true` flash).
 * - Changing `width` gives the value for the new width straight away.
 * - Safe to render on the server: there it returns `options.serverValue` (`false` by default; no
 *   `window` is touched), and the real value is used once the page runs in the browser.
 * - Without `window.matchMedia` (a very old browser) it stays `false`.
 *
 * @param width - Breakpoint in px. @default 1023
 * @param options - `serverValue`: the value on the server and during hydration. @default false
 */
export const useIsSmallScreen = (
  width = 1023,
  { serverValue = false }: IUseIsSmallScreenOptions = {},
): boolean => {
  const query = `(max-width: ${String(width)}px)`;

  // One MediaQueryList per query: reading it is cheap, creating one on every snapshot read is not.
  const mediaQuery = useMemo(
    () =>
      typeof window !== 'undefined' && typeof window.matchMedia === 'function'
        ? window.matchMedia(query)
        : null,
    [query],
  );

  const subscribe = useCallback(
    (onChange: () => void) => {
      if (!mediaQuery) return () => undefined;

      mediaQuery.addEventListener('change', onChange);

      return () => {
        mediaQuery.removeEventListener('change', onChange);
      };
    },
    [mediaQuery],
  );

  const getSnapshot = useCallback(() => mediaQuery?.matches ?? false, [mediaQuery]);

  return useSyncExternalStore(subscribe, getSnapshot, () => serverValue);
};
