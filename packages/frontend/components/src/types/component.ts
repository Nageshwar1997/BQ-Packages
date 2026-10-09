import type { IconProps } from '@iconify/react';
import type { ButtonHTMLAttributes, ReactElement, ReactNode } from 'react';

export interface IClassName {
  className?: string;
}

export interface IContainerClassName {
  containerClassName?: string;
}

export interface IChildren {
  children: ReactNode | ReactElement;
}

export interface IButton extends IClassName {
  buttonProps?: Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children' | 'content'>;
  content: IconProps | string;
  pattern: 'primary' | 'secondary' | 'tertiary' | 'outline' | 'transparent';
  leftIcon?: IconProps;
  rightIcon?: IconProps;
}

export interface ITitleDescription {
  title: string | ReactNode;
  description?: string | ReactNode;
}

export interface ITooltip extends IClassName, IChildren, ITitleDescription, IContainerClassName {
  placement?: 'top' | 'bottom' | 'left' | 'right';
  required?: boolean;
}
