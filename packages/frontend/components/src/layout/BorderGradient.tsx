import type { ComponentProps } from 'react';

import type { IContainerClassName } from '../types/component.js';

export interface IBorderGradient extends ComponentProps<'div'>, IContainerClassName {}

/**
 * A card with a border that is a gradient: the outer box is the 1px border, the inner one is the
 * card. Any attribute of a `<div>` goes to the card (`className` too); `containerClassName` is for
 * the border box.
 */
export const BorderGradient = ({
  children,
  className = '',
  containerClassName = '',
  ...divProps
}: IBorderGradient) => (
  <div className={`bg-border-gradient mx-auto w-full rounded-3xl p-px ${containerClassName}`}>
    <div
      {...divProps}
      className={`shadow-light-dark-soft bg-platinum-black base:p-6 rounded-[23px] p-4 ${className}`}
    >
      {children}
    </div>
  </div>
);
