import { useEffect, useLayoutEffect, useRef } from 'react';

export interface IOutsideClickOptions {
  /** Turn the listener off (e.g. while a popup is closed). @default true */
  enabled?: boolean;
}

/**
 * Calls `callback` when the user presses down (mouse, touch or pen) anywhere outside the element
 * the returned ref is attached to.
 *
 * - Listens for `pointerdown` on `document` in the capture phase, so an inner `stopPropagation()`
 *   cannot hide the press.
 * - The listener is added once and only re-added when `enabled` changes: the latest `callback` is
 *   used, so passing a new inline function on every render costs nothing.
 *
 * @param callback - Called with the `pointerdown` event.
 * @param options - `enabled` (default `true`) switches the listener off.
 */
export const useOutsideClick = <T extends HTMLElement>(
  callback: (event: PointerEvent) => void,
  { enabled = true }: IOutsideClickOptions = {},
) => {
  const ref = useRef<T | null>(null);
  const callbackRef = useRef(callback);

  // Updated as soon as a render commits, so the listener below never needs `callback` as a dependency.
  useLayoutEffect(() => {
    callbackRef.current = callback;
  });

  useEffect(() => {
    if (!enabled) return;

    const handleClickOutside = (event: PointerEvent) => {
      const element = ref.current;

      if (element && event.target instanceof Node && !element.contains(event.target)) {
        callbackRef.current(event);
      }
    };

    document.addEventListener('pointerdown', handleClickOutside, true);

    return () => {
      document.removeEventListener('pointerdown', handleClickOutside, true);
    };
  }, [enabled]);

  return ref;
};
