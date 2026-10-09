import { Icon } from '@iconify/react';
import { twMerge } from 'tailwind-merge';

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
  // A class that is given wins over the one it clashes with (`rounded-md` over `rounded-lg`),
  // with no `!`; one for another screen size (`lg:px-5`) is a different class and stays.
  <button
    {...buttonProps}
    ref={ref}
    className={twMerge(BASE_CSS, getButtonCss(pattern), className, buttonProps?.className)}
    type={buttonProps?.type ?? 'button'}
  >
    {leftIcon && <Icon {...leftIcon} />}
    {typeof content === 'object' ? <Icon {...content} /> : content}
    {rightIcon && <Icon {...rightIcon} />}
  </button>
);
