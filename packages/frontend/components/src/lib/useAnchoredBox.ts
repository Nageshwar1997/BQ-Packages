import { type RefObject, useLayoutEffect, useState } from 'react';

import {
  getDropdownPlacement,
  type IDropdownRect,
  type TDropdownPlacement,
} from './dropdown-position.js';

export interface IAnchoredBox {
  /** Where the anchor is on the screen. */
  rect: IDropdownRect;
  /** The side of the anchor the box goes on. */
  placement: TDropdownPlacement;
}

export interface IAnchoredBoxOptions {
  /** The box is open: it is only measured (and followed) while it is. */
  isOpen: boolean;
  /** The element the box opens from. */
  anchorRef: RefObject<HTMLElement | null>;
  /** The side the app asked for. */
  position: TDropdownPlacement;
  /** How tall the box is, or the most it can be. */
  needed: number;
}

/**
 * Where a box that opens from an element (a list, a picker) goes: under or over it, on the side with
 * room. It is measured before the browser paints, so the box never shows in the wrong place for a
 * moment, and again whenever the page scrolls or the window is resized. It is `null` until the first
 * measure; use it with `getDropdownStyle()`.
 */
export const useAnchoredBox = ({
  isOpen,
  anchorRef,
  position,
  needed,
}: IAnchoredBoxOptions): IAnchoredBox | null => {
  const [box, setBox] = useState<IAnchoredBox | null>(null);

  useLayoutEffect(() => {
    if (!isOpen) return;

    const update = () => {
      const anchor = anchorRef.current;

      if (!anchor) return;

      const rect = anchor.getBoundingClientRect();

      setBox({
        rect,
        placement: getDropdownPlacement({
          rect,
          viewportHeight: window.innerHeight,
          desired: position,
          needed,
        }),
      });
    };

    update();
    window.addEventListener('scroll', update, true);
    window.addEventListener('resize', update);

    return () => {
      window.removeEventListener('scroll', update, true);
      window.removeEventListener('resize', update);
    };
  }, [isOpen, anchorRef, position, needed]);

  return box;
};
