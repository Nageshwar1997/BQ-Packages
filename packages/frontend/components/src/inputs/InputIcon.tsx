import { Icon } from '@iconify/react';
import { isValidElement } from 'react';

import type { TInputIcon } from './types.js';

const BUTTON_CSS =
  'flex shrink-0 cursor-pointer items-center rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-crayola-c disabled:cursor-not-allowed disabled:opacity-60';

/**
 * An icon at one end of a field. An element is drawn as it is. An icon of Iconify is drawn as a
 * picture, or, when it has an `onClick`, inside a `<button>` that has the `label` as its name.
 */
export const InputIcon = ({ icon }: { icon?: TInputIcon }) => {
  if (!icon) return null;

  if (isValidElement(icon)) return icon;

  if (icon.onClick) {
    const { onClick, label, disabled, className = '', ...iconProps } = icon;

    return (
      <button
        type="button"
        aria-label={label}
        disabled={disabled}
        onClick={onClick}
        className={BUTTON_CSS}
      >
        <Icon {...iconProps} className={className} />
      </button>
    );
  }

  const { className = '', ...iconProps } = icon;

  return <Icon {...iconProps} className={`shrink-0 ${className}`} />;
};
