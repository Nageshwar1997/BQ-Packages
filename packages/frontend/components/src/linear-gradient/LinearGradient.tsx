import type { ComponentProps } from 'react';

/** The edge of its container the gradient sits on. It is solid there and fades out going inwards. */
export type TGradientPosition = 'top' | 'bottom' | 'left' | 'right';

export interface ILinearGradient extends Omit<ComponentProps<'div'>, 'children'> {
  position: TGradientPosition;
}

const BASE_CSS = 'from-primary-invert pointer-events-none absolute z-1 to-transparent';

const POSITION_CSS: Record<TGradientPosition, string> = {
  top: 'inset-x-0 top-0 h-10 md:h-20 bg-linear-to-b',
  bottom: 'inset-x-0 bottom-0 h-10 md:h-20 bg-linear-to-t',
  left: 'inset-y-0 left-0 w-10 md:w-20 bg-linear-to-r',
  right: 'inset-y-0 right-0 w-10 md:w-20 bg-linear-to-l',
};

/**
 * A fade, in the background colour, over one edge of a scrollable area: it tells that there is more
 * to scroll without a hard cut. Put it inside a container that is `relative`. It is only decoration:
 * it does not catch the pointer and assistive technology skips it.
 */
export const LinearGradient = ({ position, className = '', ...divProps }: ILinearGradient) => (
  <div
    aria-hidden="true"
    {...divProps}
    // a position that is not one (code that is not type checked) draws nothing, not "undefined"
    className={`${BASE_CSS} ${Object.hasOwn(POSITION_CSS, position) ? POSITION_CSS[position] : ''} ${className}`}
  />
);
