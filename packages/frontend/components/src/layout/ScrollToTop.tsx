import { useEffect, useRef } from 'react';

export interface IScrollToTop {
  /**
   * The current path of the page, from the router (`useLocation().pathname`). The scroll happens
   * when it changes. The query and the hash are not part of it: a search that only changes `?page=2`
   * does not throw people back to the top.
   */
  pathname: string;
  /**
   * The `id` of the element that scrolls: the one that holds the page. Nothing happens when the page
   * has no element with this id.
   * @default 'main'
   */
  id?: string;
  /**
   * `'smooth'` is turned into `'auto'` for a person who asked their system for less motion.
   * @default 'auto'
   */
  behavior?: ScrollBehavior;
  /** @default 'start' */
  block?: ScrollLogicalPosition;
  /** @default 'nearest' */
  inline?: ScrollLogicalPosition;
  /**
   * Leaves the page where it is when the component first shows, and scrolls only on the changes of
   * `pathname` after that. Needed when the browser puts the page back where it was on a reload.
   * @default false
   */
  skipInitial?: boolean;
}

/**
 * Scrolls an element of the page (`#main` unless told another) to the top each time the path
 * changes, as a router does not do it for a single page app. It draws nothing; put it once, inside
 * the layout that has the element.
 */
export const ScrollToTop = ({
  pathname,
  id = 'main',
  behavior = 'auto',
  block = 'start',
  inline = 'nearest',
  skipInitial = false,
}: IScrollToTop) => {
  // The path that was scrolled for last. A change of `id`, `behavior`, `block` or `inline` alone is
  // not a new page, so it does not scroll. With `skipInitial` the first path counts as scrolled already.
  const scrolledPath = useRef(skipInitial ? pathname : undefined);

  useEffect(() => {
    if (scrolledPath.current === pathname) return;
    scrolledPath.current = pathname;

    const element = document.getElementById(id);
    if (!element) return;

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    element.scrollIntoView({
      behavior: behavior === 'smooth' && reduceMotion ? 'auto' : behavior,
      block,
      inline,
    });
  }, [pathname, id, behavior, block, inline]);

  return null;
};
