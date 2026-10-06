import { useCallback, useEffect, useMemo, useRef } from 'react';

type TFunction<T extends unknown[]> = (...args: T) => void;

export interface IUseDebounce<T extends unknown[]> {
  callback: TFunction<T>;
  /** @default 500 */
  delay?: number;
}

// Returns `{ trigger, cancel }` rather than a bare callable - `cancel` (mirrors lodash's
// `_.debounce().cancel()`) is needed by any caller that sometimes has to bypass the debounce and
// commit a value immediately: without explicitly cancelling, a still-pending timeout from an
// *earlier* trigger() call survives an immediate/direct update and fires later anyway, clobbering
// it with stale data. (An earlier version tried attaching `.cancel` onto the trigger function
// itself instead, to keep call sites unchanged - the react-hooks/refs and react-hooks/immutability
// lint rules both reject that shape, since it either mutates a hook-returned value after creation
// or passes a ref-touching closure through useMemo/Object.assign in a way they can't verify is
// safe. A plain two-function object sidesteps both.)
export const useDebounce = <T extends unknown[]>({ callback, delay = 500 }: IUseDebounce<T>) => {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cancel = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const trigger = useCallback(
    (...args: T) => {
      cancel();
      timeoutRef.current = setTimeout(() => {
        callback(...args);
      }, delay);
    },
    [callback, delay, cancel],
  );

  useEffect(() => cancel, [cancel]);

  return useMemo(() => ({ trigger, cancel }), [trigger, cancel]);
};
