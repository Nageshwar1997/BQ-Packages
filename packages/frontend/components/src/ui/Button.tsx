import { Icon } from '@iconify/react';
import { type MouseEvent } from 'react';

import { getButtonCss } from '../lib/button.js';
import type { IButton } from '../types/component.js';

export const Button = ({
  pattern,
  content,
  className = '',
  leftIcon,
  rightIcon,
  buttonProps,
}: IButton) => {
  const btnCSS = getButtonCss(pattern);

  const handleClick = (e: MouseEvent<HTMLButtonElement>) => {
    if (buttonProps?.disabled) return;
    buttonProps?.onClick?.(e);
  };

  return (
    <button
      {...buttonProps}
      className={`group flex w-full cursor-pointer items-center justify-center gap-1 rounded-lg px-4 py-3 text-sm leading-4 transition-all duration-300 disabled:cursor-not-allowed disabled:opacity-85 lg:px-5 lg:py-4 xl:text-base ${btnCSS} ${className} ${
        buttonProps?.className ?? ''
      }`}
      type={buttonProps?.type ?? 'button'}
      onClick={handleClick}
    >
      {leftIcon && <Icon {...leftIcon} />}
      {typeof content === 'object' ? <Icon {...content} /> : content}
      {rightIcon && <Icon {...rightIcon} />}
    </button>
  );
};
