import { useEffect, useRef } from 'react';

export interface IOutsideClickOptions {
  /** Turn the listener off (e.g. while a popup is closed). @default true */
  enabled?: boolean;
}

/**
 * Calls `callback` when the user presses down (pointer/mouse/touch) anywhere outside the element
 * the returned ref is attached to.
 *
 * Listens on `document` in the capture phase, so an inner `stopPropagation()` can't hide the press.
 */
export const useOutsideClick = <T extends HTMLElement>(
  callback: (event: MouseEvent | TouchEvent | PointerEvent) => void,
  { enabled = true }: IOutsideClickOptions = {},
) => {
  const ref = useRef<T | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const handleClickOutside = (event: MouseEvent | TouchEvent | PointerEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        callback(event);
      }
    };

    document.addEventListener('pointerdown', handleClickOutside, true);

    return () => {
      document.removeEventListener('pointerdown', handleClickOutside, true);
    };
  }, [callback, enabled]);

  return ref;
};
