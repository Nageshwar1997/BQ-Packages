import type { ITooltip } from '../types/component.js';
import { TOOLTIP_ARROW_INSET, TOOLTIP_GAP, TOOLTIP_VIEWPORT_MARGIN } from './constants.js';

type TPlacement = NonNullable<ITooltip['placement']>;

export interface ISize {
  width: number;
  height: number;
}

export interface ITooltipLayout {
  /** The side the tooltip really opens on: the opposite one when there is no room on the asked one. */
  placement: TPlacement;
  /** Where the tooltip points to, in the window (it is moved away from it by `getTooltipTransform`). */
  position: { top: number; left: number };
  /** How far the arrow moves along the tooltip to keep pointing at the content when the tooltip is pushed in. */
  arrowShift: number;
}

const OPPOSITE: Record<TPlacement, TPlacement> = {
  top: 'bottom',
  bottom: 'top',
  left: 'right',
  right: 'left',
};

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

export const getTooltipPosition = (
  rect: DOMRect,
  placement: TPlacement,
): { top: number; left: number } => {
  switch (placement) {
    case 'bottom':
      return { top: rect.bottom, left: rect.left + rect.width / 2 };
    case 'right':
      return { top: rect.top + rect.height / 2, left: rect.right };
    case 'left':
      return { top: rect.top + rect.height / 2, left: rect.left };
    case 'top':
    default:
      return { top: rect.top, left: rect.left + rect.width / 2 };
  }
};

/** Whether a tooltip of this size, on this side of the content, stays inside the window. */
const fitsOn = (rect: DOMRect, size: ISize, placement: TPlacement, viewport: ISize) => {
  switch (placement) {
    case 'bottom':
      return rect.bottom + TOOLTIP_GAP + size.height <= viewport.height - TOOLTIP_VIEWPORT_MARGIN;
    case 'right':
      return rect.right + TOOLTIP_GAP + size.width <= viewport.width - TOOLTIP_VIEWPORT_MARGIN;
    case 'left':
      return rect.left - TOOLTIP_GAP - size.width >= TOOLTIP_VIEWPORT_MARGIN;
    case 'top':
    default:
      return rect.top - TOOLTIP_GAP - size.height >= TOOLTIP_VIEWPORT_MARGIN;
  }
};

/**
 * Where the tooltip goes. Without its `size` (it is not on the page yet) it goes where it was asked
 * to. With it, it opens on the opposite side when the asked one has no room and the other has, and
 * it is pushed along that side to stay inside the window; the arrow keeps pointing at the content.
 */
export const getTooltipLayout = ({
  rect,
  placement,
  size,
  viewport,
}: {
  rect: DOMRect;
  placement: TPlacement;
  size?: ISize;
  viewport: ISize;
}): ITooltipLayout => {
  if (!size) return { placement, position: getTooltipPosition(rect, placement), arrowShift: 0 };

  const side =
    !fitsOn(rect, size, placement, viewport) && fitsOn(rect, size, OPPOSITE[placement], viewport)
      ? OPPOSITE[placement]
      : placement;
  const position = getTooltipPosition(rect, side);

  const isHorizontal = side === 'top' || side === 'bottom';
  const length = isHorizontal ? size.width : size.height;
  const limit = isHorizontal ? viewport.width : viewport.height;
  const start = (isHorizontal ? position.left : position.top) - length / 2;
  const min = TOOLTIP_VIEWPORT_MARGIN;
  const max = limit - TOOLTIP_VIEWPORT_MARGIN - length;
  // a tooltip bigger than the window cannot be pushed in, it is left where it is
  const shift = max < min ? 0 : clamp(start, min, max) - start;
  const reach = Math.max(0, length / 2 - TOOLTIP_ARROW_INSET);
  const arrowShift = clamp(-shift, -reach, reach);

  return {
    placement: side,
    position: isHorizontal
      ? { top: position.top, left: position.left + shift }
      : { top: position.top + shift, left: position.left },
    arrowShift: arrowShift === 0 ? 0 : arrowShift, // never -0
  };
};

/** Whether two layouts put the tooltip in the same place (so there is nothing to change). */
export const isSameTooltipLayout = (a: ITooltipLayout, b: ITooltipLayout) =>
  a.placement === b.placement &&
  a.arrowShift === b.arrowShift &&
  a.position.top === b.position.top &&
  a.position.left === b.position.left;

export const getTooltipTransform = (placement: TPlacement, isVisible: boolean) => {
  const gap = String(isVisible ? TOOLTIP_GAP : 0);

  switch (placement) {
    case 'bottom':
      return `translate(-50%, ${gap}px)`;
    case 'right':
      return `translate(${gap}px, -50%)`;
    case 'left':
      return `translate(calc(-100% - ${gap}px), -50%)`;
    case 'top':
    default:
      return `translate(-50%, calc(-100% - ${gap}px))`;
  }
};

// The arrow sits in the middle of its side plus `--tooltip-arrow-shift` (set by the tooltip).
export const getTooltipArrowCss = (placement: TPlacement) => {
  switch (placement) {
    case 'bottom':
      return 'after:bottom-full after:left-[calc(50%_+_var(--tooltip-arrow-shift,0px))] after:-translate-x-1/2 after:border-b-silver-jet-2';
    case 'right':
      return 'after:top-[calc(50%_+_var(--tooltip-arrow-shift,0px))] after:right-full after:-translate-y-1/2 after:border-r-silver-jet-2';
    case 'left':
      return 'after:top-[calc(50%_+_var(--tooltip-arrow-shift,0px))] after:left-full after:-translate-y-1/2 after:border-l-silver-jet-2';
    case 'top':
    default:
      return 'after:top-full after:left-[calc(50%_+_var(--tooltip-arrow-shift,0px))] after:-translate-x-1/2 after:border-t-silver-jet-2';
  }
};
