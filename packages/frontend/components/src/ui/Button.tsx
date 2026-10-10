import { Icon } from '@iconify/react';

import { getButtonCss } from '../lib/button.js';
import type { IButton } from '../types/component.js';

const BASE_CSS =
  'group flex w-full cursor-pointer items-center justify-center gap-1 rounded-lg px-4 py-3 text-sm leading-4 transition-all duration-300 disabled:cursor-not-allowed disabled:opacity-85 lg:px-5 lg:py-4 xl:text-base';

export const Button = ({
  pattern,
  content,
  className = '',
  leftIcon,
  rightIcon,
  buttonProps,
  ref,
}: IButton) => (
  // The classes that are given come last but do not remove the button's own: to win over one of
  // them give it with `!` (`rounded-md!`), the way the toast's button does.
  <button
    {...buttonProps}
    ref={ref}
    className={`${BASE_CSS} ${getButtonCss(pattern)} ${className} ${buttonProps?.className ?? ''}`}
    type={buttonProps?.type ?? 'button'}
  >
    {leftIcon && <Icon {...leftIcon} />}
    {typeof content === 'object' ? <Icon {...content} /> : content}
    {rightIcon && <Icon {...rightIcon} />}
  </button>
);
