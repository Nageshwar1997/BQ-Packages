import { Icon } from '@iconify/react';
import type { ComponentProps } from 'react';

import { registerInputIcons } from './inputs-icons.js';

export interface IInputError extends Omit<ComponentProps<'p'>, 'children'> {
  /** The message. Nothing is drawn while it is empty. */
  error?: string;
}

/**
 * The message under a field. It is an alert: a screen reader says it as soon as it appears. Give it an
 * `id` and put that id in the `aria-describedby` of the field, so the message is read with the field.
 */
export const InputError = ({ error = '', className = '', ...pProps }: IInputError) => {
  registerInputIcons();

  if (!error) return null;

  return (
    <p
      role="alert"
      {...pProps}
      className={`text-red-c flex w-full items-center gap-1 text-start text-[11px] ${className}`}
    >
      <Icon icon="solar:info-circle-linear" className="mb-0.5 shrink-0" />
      <span className="line-clamp-2 leading-3 whitespace-pre-line first-letter:uppercase">
        {error}
      </span>
    </p>
  );
};
