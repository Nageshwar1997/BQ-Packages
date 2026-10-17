import { type RefObject, useEffect, useRef } from 'react';

import { getTabbable } from './focus.js';
import { sharedState } from './shared-state.js';

export interface IFocusTrapOptions {
  /** Turn the trap on (while the dialog is open). */
  enabled: boolean;
  /** The element that gets the focus first. Without it: the first element that Tab stops on, or the dialog. */
  initialFocus?: RefObject<HTMLElement | null>;
  /** Give the focus back to what had it before the dialog opened, when it closes. @default true */
  returnFocus?: boolean;
}

// The traps that are on, the last one on top: with a dialog open over another one only the top one
// keeps the focus in. One stack for the whole page (see `sharedState`): the dialogs can be in different
// entries of the package.
const activeTraps = sharedState('focus-traps', (): symbol[] => []);

/**
 * Keeps the keyboard inside a dialog, the way a dialog has to behave:
 *
 * - when it opens the focus goes into it (to `initialFocus`, or the first thing Tab stops on, or the
 *   dialog itself);
 * - Tab on the last element goes to the first, and Shift + Tab on the first goes to the last, so the
 *   focus cannot get to the page behind;
 * - when it closes the focus goes back to what had it before, so a person who opened it with the
 *   keyboard is where they were.
 *
 * @returns the ref for the dialog (it should have `tabIndex={-1}`, so it can hold the focus when it has
 * nothing to focus in it).
 */
export const useFocusTrap = <T extends HTMLElement>({
  enabled,
  initialFocus,
  returnFocus = true,
}: IFocusTrapOptions): RefObject<T | null> => {
  const ref = useRef<T | null>(null);
  const initialFocusRef = useRef(initialFocus);

  useEffect(() => {
    initialFocusRef.current = initialFocus;
  });

  useEffect(() => {
    const dialog = ref.current;

    if (!enabled || !dialog) return;

    const token = Symbol('trap');
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;

    activeTraps.push(token);
    (initialFocusRef.current?.current ?? getTabbable(dialog).at(0) ?? dialog).focus();

    const handleKey = (event: KeyboardEvent) => {
      if (event.key !== 'Tab' || activeTraps.at(-1) !== token) return;

      const tabbable = getTabbable(dialog);
      const first = tabbable.at(0);
      const last = tabbable.at(-1);
      const current = document.activeElement;

      if (!first || !last) {
        event.preventDefault();
        dialog.focus();

        return;
      }

      if (!(current instanceof Node) || !dialog.contains(current) || current === dialog) {
        // the focus is on the dialog itself, or got out: bring it in
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
      } else if (event.shiftKey && current === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && current === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKey);

    return () => {
      document.removeEventListener('keydown', handleKey);

      const index = activeTraps.indexOf(token);

      if (index !== -1) activeTraps.splice(index, 1);

      if (returnFocus && previous?.isConnected) previous.focus();
    };
  }, [enabled, returnFocus]);

  return ref;
};
