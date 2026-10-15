import { useSyncExternalStore } from 'react';

const subscribe = () => () => undefined;

/**
 * `false` on a server and while a page is hydrated, `true` in the browser after that. What needs the
 * `document` (a portal into `document.body`) waits for it, so the server and the first render in
 * the browser draw the same.
 */
export const useIsClient = () =>
  useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
