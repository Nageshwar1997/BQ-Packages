import type { CSSProperties } from 'react';

import type { ITooltip } from '../types/component.js';
import { TOOLTIP_GAP } from './constants.js';

export const getTooltipPosition = (
  rect: DOMRect,
  placement: NonNullable<ITooltip['placement']>,
): CSSProperties => {
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

export const getTooltipTransform = (
  placement: NonNullable<ITooltip['placement']>,
  isVisible: boolean,
) => {
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

export const getTooltipArrowCss = (placement: NonNullable<ITooltip['placement']>) => {
  switch (placement) {
    case 'bottom':
      return 'after:bottom-full after:left-1/2 after:-translate-x-1/2 after:border-b-silver-jet-2';
    case 'right':
      return 'after:top-1/2 after:right-full after:-translate-y-1/2 after:border-r-silver-jet-2';
    case 'left':
      return 'after:top-1/2 after:left-full after:-translate-y-1/2 after:border-l-silver-jet-2';
    case 'top':
    default:
      return 'after:top-full after:left-1/2 after:-translate-x-1/2 after:border-t-silver-jet-2';
  }
};
