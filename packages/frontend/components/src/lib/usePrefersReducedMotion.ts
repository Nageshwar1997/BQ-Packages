import { useSyncExternalStore } from 'react';

const QUERY = '(prefers-reduced-motion: reduce)';

// `matchMedia` is in every browser; a test environment such as jsdom may not have it, and then the
// answer is "no preference" instead of an error.
const query = () => (window as Partial<Window>).matchMedia?.(QUERY);

const subscribe = (onChange: () => void) => {
  const list = query();

  list?.addEventListener('change', onChange);

  return () => {
    list?.removeEventListener('change', onChange);
  };
};

const getSnapshot = () => query()?.matches ?? false;
const getServerSnapshot = () => false;

/**
 * Whether the person asked their system for less motion. It follows the setting while the page is
 * open, and is `false` on a server (a page that moves by itself starts still there and stops once the
 * browser says so).
 */
export const usePrefersReducedMotion = () =>
  useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
