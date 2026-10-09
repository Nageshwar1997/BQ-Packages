import type { IconProps } from '@iconify/react';
import type { ButtonHTMLAttributes, ReactElement, ReactNode, Ref } from 'react';

export interface IClassName {
  className?: string;
}

export interface IContainerClassName {
  containerClassName?: string;
}

export interface IChildren {
  children: ReactNode | ReactElement;
}

type TButtonHtmlProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children' | 'content'>;

interface IButtonBase extends IClassName {
  pattern: 'primary' | 'secondary' | 'tertiary' | 'outline' | 'transparent';
  leftIcon?: IconProps;
  rightIcon?: IconProps;
  /** The `<button>` itself, e.g. to move the focus to it. */
  ref?: Ref<HTMLButtonElement>;
}

/** A button that says what it does in words. */
export interface ITextButton extends IButtonBase {
  content: string;
  buttonProps?: TButtonHtmlProps;
}

/** A button that is only an icon: it has no words, so it has to be given a name. */
export interface IIconButton extends IButtonBase {
  content: IconProps;
  /** A screen reader reads this name: without it the button is just "button". */
  buttonProps: TButtonHtmlProps & ({ 'aria-label': string } | { 'aria-labelledby': string });
}

export type IButton = ITextButton | IIconButton;

export interface ITitleDescription {
  title: string | ReactNode;
  description?: string | ReactNode;
}

export interface ITooltip extends IClassName, IChildren, ITitleDescription, IContainerClassName {
  placement?: 'top' | 'bottom' | 'left' | 'right';
  required?: boolean;
}
