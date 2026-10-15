import { type RefObject, useEffect, useLayoutEffect, useRef } from 'react';

export type TDismissReason = 'outside' | 'escape';

export interface IDismissOptions {
  /** Turn the listeners off (e.g. while a popup is closed). @default true */
  enabled?: boolean;
  /**
   * Elements that count as inside although they are not inside the element in the DOM: a popup that
   * is rendered with `createPortal()` into `document.body`. A press on one of them (or on anything in
   * it) is not "outside". Refs that are not attached are skipped. The list is read when the press
   * happens, so a new array on every render is fine.
   */
  ignore?: readonly RefObject<Element | null>[];
  /** Dismiss when the user presses outside the element. @default true */
  outside?: boolean;
  /** Dismiss when the user presses Escape. @default true */
  escape?: boolean;
}

// The popups that are open, the last one on top. Escape closes the one on top only: a select that is
// open inside a dialog closes first, and the dialog stays until the next Escape.
const openStack: symbol[] = [];

/**
 * Closes a popup (a select, a dialog, a menu) the way people expect: a press (mouse, touch or pen)
 * anywhere outside it, or Escape.
 *
 * - The press is listened for on `document` in the capture phase, so an inner `stopPropagation()`
 *   cannot hide it, and "inside" is decided from the path the event took (`composedPath()`), which
 *   stays right when the pressed node is removed by another listener first.
 * - A popup portalled out of the element is not inside it in the DOM: list its ref in `ignore`.
 * - Escape only reaches the popup that opened last, and not an Escape that something else already
 *   handled (`defaultPrevented`).
 * - The listeners are added once and only when `enabled` changes: the latest `onDismiss` and `ignore`
 *   are used, so passing new ones on every render costs nothing.
 *
 * @returns the ref to put on the popup (or on its trigger, when the popup is portalled).
 */
export const useDismiss = <T extends HTMLElement>(
  onDismiss: (reason: TDismissReason, event: Event) => void,
  { enabled = true, ignore, outside = true, escape = true }: IDismissOptions = {},
): RefObject<T | null> => {
  const ref = useRef<T | null>(null);
  const onDismissRef = useRef(onDismiss);
  const ignoreRef = useRef(ignore);

  // Updated as soon as a render commits, so the listeners below never need them as dependencies.
  useLayoutEffect(() => {
    onDismissRef.current = onDismiss;
    ignoreRef.current = ignore;
  });

  useEffect(() => {
    if (!enabled) return;

    const token = Symbol('dismissable');

    // a popup that does not listen for Escape is not in the stack: it must not hide the ones below it
    if (escape) openStack.push(token);

    const handlePress = (event: PointerEvent) => {
      const element = ref.current;

      if (!outside || !element) return;

      const path = event.composedPath();
      const isInside =
        path.includes(element) ||
        (ignoreRef.current ?? []).some(({ current }) => current !== null && path.includes(current));

      if (!isInside) onDismissRef.current('outside', event);
    };

    const handleKey = (event: KeyboardEvent) => {
      if (!escape || event.key !== 'Escape' || event.defaultPrevented) return;
      if (openStack.at(-1) !== token) return;

      onDismissRef.current('escape', event);
    };

    document.addEventListener('pointerdown', handlePress, true);
    document.addEventListener('keydown', handleKey);

    return () => {
      document.removeEventListener('pointerdown', handlePress, true);
      document.removeEventListener('keydown', handleKey);

      const index = openStack.indexOf(token);

      if (index !== -1) openStack.splice(index, 1);
    };
  }, [enabled, outside, escape]);

  return ref;
};
