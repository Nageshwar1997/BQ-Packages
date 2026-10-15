import type { IconProps } from '@iconify/react';
import type {
  ChangeEvent,
  FocusEvent,
  InputHTMLAttributes,
  MouseEvent,
  ReactElement,
  RefCallback,
} from 'react';

import type { IClassName, IContainerClassName } from '../types/component.js';

/** An icon that only decorates the field. */
export interface IInputDecorationIcon extends Omit<IconProps, 'onClick'> {
  onClick?: undefined;
  /** Only an icon that does something has a label: it names its button. */
  label?: never;
}

/**
 * An icon that does something when it is pressed (shows the password, clears the search). It is
 * drawn inside a real `<button>`, which has to be named: a screen reader says the name, not the icon.
 */
export interface IInputActionIcon extends Omit<IconProps, 'onClick'> {
  onClick: (event: MouseEvent<HTMLButtonElement>) => void;
  /** What the button does, e.g. `"Show password"`. */
  label: string;
  /** The button cannot be pressed. */
  disabled?: boolean;
}

/** An icon of Iconify (`{ icon: 'solar:eye-linear' }`) or any element. */
export type TInputIcon = IInputDecorationIcon | IInputActionIcon | ReactElement;

export type TInputIcons = Partial<Record<'left' | 'right', TInputIcon>>;

/**
 * What the `register()` of React Hook Form gives back, as far as a field needs it. It is described
 * here (not imported) so this package does not need React Hook Form: its own type fits.
 */
export interface IFieldRegistration<TElement extends HTMLElement = HTMLInputElement> {
  name: string;
  onChange: (event: ChangeEvent<TElement>) => unknown;
  onBlur: (event: FocusEvent<TElement>) => unknown;
  ref: RefCallback<TElement>;
  min?: InputHTMLAttributes<TElement>['min'];
  max?: InputHTMLAttributes<TElement>['max'];
  maxLength?: number;
  minLength?: number;
  pattern?: string;
  required?: boolean;
  disabled?: boolean;
}

/** What every field has: a label on its border, a message under it, and a class for each box. */
export interface IFieldBase extends IClassName, IContainerClassName {
  /** The text on the border of the field. It names the field for assistive technology. */
  label?: string;
  /** The message under the field; the field is marked as invalid while there is one. */
  error?: string;
}
