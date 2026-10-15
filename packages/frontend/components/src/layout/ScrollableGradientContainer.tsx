import { type ReactNode, type Ref, useMemo } from 'react';

import { LinearGradient, type TGradientPosition } from '../linear-gradient/index.js';
import { mergeRefs } from '../lib/mergeRefs.js';
import { type TScrollDirection, useScrollable } from '../lib/useScrollable.js';
import type { IClassName, IContainerClassName } from '../types/component.js';

export interface IScrollableGradientContainer extends IClassName, IContainerClassName {
  /** The way the content scrolls: a row (`'horizontal'`) or a column (`'vertical'`). */
  direction: TScrollDirection;
  /** Classes for the fade on each edge, e.g. `{ top: 'h-8!' }`. */
  gradientClassNames?: Partial<Record<TGradientPosition, string>>;
  /**
   * Names the area that scrolls for assistive technology (`role="region"`). Give it when what scrolls
   * is a part of the page of its own (a list of thumbnails, a long form) and not the page.
   */
  label?: string;
  /** The element that scrolls, e.g. to move it to an item (`scrollLeft`, `scrollTop`). */
  scrollerRef?: Ref<HTMLDivElement>;
  children: ReactNode;
}

const EDGES: readonly TGradientPosition[] = ['top', 'bottom', 'left', 'right'];
const NO_GRADIENT_CLASSES: Partial<Record<TGradientPosition, string>> = {};

/**
 * Content that scrolls inside a box, with a fade on the edge that has more behind it. The fade
 * shows only once there is something to scroll to, and goes when the end is reached. The content is
 * centred while it fits, and starts at the beginning once it scrolls.
 *
 * A box that scrolls can be reached with the keyboard (it is a tab stop while it scrolls) so that
 * people who do not use a mouse can scroll it with the arrow keys.
 */
export const ScrollableGradientContainer = ({
  direction,
  gradientClassNames = NO_GRADIENT_CLASSES,
  className = '',
  containerClassName = '',
  label,
  scrollerRef,
  children,
}: IScrollableGradientContainer) => {
  const { ref, edges } = useScrollable<HTMLDivElement>(direction);
  const mergedRef = useMemo(() => mergeRefs<HTMLDivElement>(ref, scrollerRef), [ref, scrollerRef]);

  const isVertical = direction === 'vertical';
  const isScrollable = EDGES.some((edge) => edges[edge]);

  return (
    <div
      className={`relative flex overflow-hidden ${isVertical ? 'h-full w-full flex-col' : 'h-fit w-full flex-row'} ${containerClassName}`}
    >
      {EDGES.filter((edge) => edges[edge]).map((edge) => (
        <LinearGradient key={edge} position={edge} className={gradientClassNames[edge]} />
      ))}
      <div
        ref={mergedRef}
        // a box that scrolls has to be reachable with the keyboard, or it cannot be scrolled with it
        tabIndex={isScrollable ? 0 : undefined}
        role={isScrollable && label ? 'region' : undefined}
        aria-label={isScrollable ? label : undefined}
        className={`relative scroll-smooth outline-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-blue-crayola-c motion-reduce:scroll-auto ${
          isVertical ? 'flex-1 overflow-y-auto' : 'grow overflow-x-auto'
        } ${className}`}
      >
        <div
          className={`flex h-full w-full gap-2 ${isVertical ? 'min-h-full flex-col' : 'min-w-full flex-row'} ${
            isScrollable ? 'items-start justify-start' : 'items-center justify-center'
          }`}
        >
          {children}
        </div>
      </div>
    </div>
  );
};
