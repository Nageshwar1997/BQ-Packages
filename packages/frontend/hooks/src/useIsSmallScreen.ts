import { useCallback, useSyncExternalStore } from 'react';

/**
 * Whether the viewport is at most `width` px wide (`(max-width: ${width}px)`), kept in sync with
 * the window as it is resized.
 *
 * - The first client render already has the right value (no `false` then `true` flash).
 * - Changing `width` gives the value for the new width straight away.
 * - Safe to render on the server: there it returns `false` (no `window` is touched), and the real
 *   value is used once the page runs in the browser.
 *
 * @param width - Breakpoint in px. @default 1023
 */
export const useIsSmallScreen = (width = 1023): boolean => {
  const query = `(max-width: ${String(width)}px)`;

  const subscribe = useCallback(
    (onChange: () => void) => {
      const mediaQuery = window.matchMedia(query);

      mediaQuery.addEventListener('change', onChange);

      return () => {
        mediaQuery.removeEventListener('change', onChange);
      };
    },
    [query],
  );

  const getSnapshot = useCallback(() => window.matchMedia(query).matches, [query]);

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
};

const getServerSnapshot = () => false;
