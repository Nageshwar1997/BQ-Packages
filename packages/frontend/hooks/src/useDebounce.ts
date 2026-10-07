import { useCallback, useEffect, useLayoutEffect, useMemo, useRef } from 'react';

type TFunction<T extends unknown[]> = (...args: T) => void;

export interface IUseDebounce<T extends unknown[]> {
  /** Runs `delay` ms after the last `trigger()`. The latest `callback` passed to the hook is used. */
  callback: TFunction<T>;
  /** @default 500 */
  delay?: number;
}

/**
 * Debounces `callback`: after the last `trigger(...args)`, waits `delay` ms and then calls it once
 * with those args.
 *
 * - The `callback` that runs is the one from the **latest render**, not the one from the render
 *   `trigger()` was called in, so it never sees stale state.
 * - `trigger` and `cancel` keep the same identity between renders (only a new `delay` gives a new
 *   `trigger`), so an inline `callback` is fine and they are safe in dependency arrays.
 * - A pending call is cancelled when the component unmounts, and a `trigger()` made after that is
 *   ignored.
 *
 * Returns `{ trigger, cancel }` rather than a bare callable - `cancel` (mirrors lodash's
 * `_.debounce().cancel()`) is needed by any caller that sometimes has to bypass the debounce and
 * commit a value immediately: without explicitly cancelling, a still-pending timeout from an
 * *earlier* trigger() call survives an immediate/direct update and fires later anyway, clobbering
 * it with stale data. (An earlier version tried attaching `.cancel` onto the trigger function
 * itself instead, to keep call sites unchanged - the react-hooks/refs and react-hooks/immutability
 * lint rules both reject that shape, since it either mutates a hook-returned value after creation
 * or passes a ref-touching closure through useMemo/Object.assign in a way they can't verify is
 * safe. A plain two-function object sidesteps both.)
 */
export const useDebounce = <T extends unknown[]>({ callback, delay = 500 }: IUseDebounce<T>) => {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const callbackRef = useRef(callback);
  const isMountedRef = useRef(true);

  // Kept in a ref (updated as soon as a render commits) so `trigger` does not depend on `callback`:
  // its identity stays stable, and the timer calls the newest callback when it fires.
  useLayoutEffect(() => {
    callbackRef.current = callback;
  });

  const cancel = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const trigger = useCallback(
    (...args: T) => {
      if (!isMountedRef.current) return;

      cancel();
      timeoutRef.current = setTimeout(() => {
        timeoutRef.current = null;
        callbackRef.current(...args);
      }, delay);
    },
    [delay, cancel],
  );

  useEffect(() => {
    // Set again on every mount: React StrictMode runs the cleanup once and mounts again.
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
      cancel();
    };
  }, [cancel]);

  return useMemo(() => ({ trigger, cancel }), [trigger, cancel]);
};
