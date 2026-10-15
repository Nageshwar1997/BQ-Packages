import { type RefObject, useEffect, useRef, useState } from 'react';

export type TScrollDirection = 'horizontal' | 'vertical';

/** The edges of a scrollable area that have more content behind them (where a fade is shown). */
export type TScrollEdges = Partial<Record<'top' | 'bottom' | 'left' | 'right', true>>;

// Browsers report positions with a fraction (zoom, scaling): a gap this small is "at the end".
const SCROLL_EPSILON = 4;

/**
 * Which edges of the scrollable element have more to scroll to. It follows the scroll, and the size
 * of the element and of its content (a ResizeObserver), so a list that grows or a window that is
 * resized is noticed. Nothing is reported on the server and on the first render.
 *
 * @returns `ref` for the element that scrolls and `edges` (e.g. `{ left: true }` once it was scrolled
 * a little, `{ left: true, right: true }` in the middle).
 */
export const useScrollable = <T extends HTMLElement>(
  direction: TScrollDirection,
): { ref: RefObject<T | null>; edges: TScrollEdges } => {
  const ref = useRef<T | null>(null);
  const [edges, setEdges] = useState<TScrollEdges>({});

  useEffect(() => {
    const element = ref.current;

    if (!element) return;

    const check = () => {
      const isHorizontal = direction === 'horizontal';
      const size = isHorizontal ? element.clientWidth : element.clientHeight;
      const total = isHorizontal ? element.scrollWidth : element.scrollHeight;
      const position = isHorizontal ? element.scrollLeft : element.scrollTop;

      const hasScroll = total - size > SCROLL_EPSILON;
      const hasBefore = hasScroll && position > SCROLL_EPSILON;
      const hasAfter = hasScroll && total - (position + size) > SCROLL_EPSILON;

      const next: TScrollEdges = isHorizontal
        ? { ...(hasBefore && { left: true as const }), ...(hasAfter && { right: true as const }) }
        : { ...(hasBefore && { top: true as const }), ...(hasAfter && { bottom: true as const }) };

      // the same edges again: no new state, so no render
      setEdges((current) =>
        current.top === next.top &&
        current.bottom === next.bottom &&
        current.left === next.left &&
        current.right === next.right
          ? current
          : next,
      );
    };

    check();
    element.addEventListener('scroll', check, { passive: true });

    const observer = new ResizeObserver(check);

    observer.observe(element);
    if (element.firstElementChild) observer.observe(element.firstElementChild);

    return () => {
      element.removeEventListener('scroll', check);
      observer.disconnect();
    };
  }, [direction]);

  return { ref, edges };
};
