import type { ComponentProps } from 'react';

/**
 * A grey block that pulses where something is still loading. It is only a picture of the shape, so
 * it is hidden from assistive technology: say that the area is loading where it is (`aria-busy` on
 * the area, a `role="status"` text) and not on every block. The pulse stops for a person who asked
 * for less motion.
 */
export const Skeleton = ({ className = '', ...divProps }: ComponentProps<'div'>) => (
  <div
    aria-hidden="true"
    {...divProps}
    className={`bg-primary/50 size-full animate-pulse rounded-xs motion-reduce:animate-none ${className}`}
  />
);
