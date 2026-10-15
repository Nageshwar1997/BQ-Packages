import { Icon } from '@iconify/react';
import { type ReactNode, useId, useState } from 'react';

import { useDismiss } from '../lib/useDismiss.js';
import { InputIcon, type TInputIcons } from '../inputs/index.js';
import type { IClassName } from '../types/component.js';
import { registerLayoutIcons } from './layout-icons.js';

export interface IDropdownApi {
  /** Closes the dropdown, e.g. when something in it was chosen. */
  close: () => void;
}

export interface IDropdown extends IClassName {
  /** What the button says: text, or an element. */
  title: ReactNode;
  /** An icon on each side of the title. One with an `onClick` is a button and needs a `label`. */
  icons?: TInputIcons;
  /** What is in the dropdown, or a function that gets `{ close }` to close it. */
  children: ReactNode | ((api: IDropdownApi) => ReactNode);
  /** Open when it is first shown. @default false */
  defaultOpen?: boolean;
  /** A press outside closes it. @default false */
  closeOnOutsideClick?: boolean;
  /** Escape closes it (unless a popup over it takes the Escape first). @default false */
  closeOnEscape?: boolean;
  /** The content floats over the page under the button instead of pushing it down. @default false */
  isAbsolute?: boolean;
  showShadow?: boolean;
  isRounded?: boolean;
}

/**
 * A button that opens and closes a panel under it (a disclosure): `aria-expanded` says which it is, the
 * panel opens and closes with a slide, and a closed panel is out of reach of the keyboard and of
 * assistive technology (`inert`), not only out of sight. The slide stops for a person who asked for
 * less motion.
 */
export const Dropdown = ({
  title,
  icons,
  children,
  className = '',
  defaultOpen = false,
  closeOnOutsideClick = false,
  closeOnEscape = false,
  isAbsolute = false,
  showShadow = false,
  isRounded = false,
}: IDropdown) => {
  registerLayoutIcons();

  const baseId = useId();
  const panelId = `${baseId}-panel`;
  const [isOpen, setIsOpen] = useState(defaultOpen);

  const ref = useDismiss<HTMLDivElement>(
    () => {
      setIsOpen(false);
    },
    { enabled: isOpen, outside: closeOnOutsideClick, escape: closeOnEscape },
  );

  const close = () => {
    setIsOpen(false);
  };

  return (
    <div
      ref={ref}
      className={`flex w-full flex-col items-start ${isAbsolute ? 'relative' : 'static'} ${className}`}
    >
      <button
        type="button"
        aria-expanded={isOpen}
        aria-controls={panelId}
        className="bg-primary-invert group flex w-full cursor-pointer items-center justify-between gap-2 px-3 py-2 text-left transition-colors duration-300 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-blue-crayola-c xl:py-3"
        onClick={() => {
          setIsOpen((current) => !current);
        }}
      >
        <span className="flex items-center gap-3">
          <InputIcon icon={icons?.left} />
          <span className="text-primary text-sm font-medium whitespace-nowrap">{title}</span>
          <InputIcon icon={icons?.right} />
        </span>
        <Icon
          icon="solar:alt-arrow-down-linear"
          className={`text-primary size-4 transition-transform duration-300 ease-in-out motion-reduce:transition-none md:size-5 ${
            isOpen ? 'rotate-180' : 'rotate-0'
          }`}
        />
      </button>
      <div
        id={panelId}
        inert={!isOpen}
        className={`bg-primary-invert grid w-full transition-[grid-template-rows,opacity] duration-500 ease-in-out motion-reduce:transition-none ${
          isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
        } ${isAbsolute ? 'absolute inset-x-0 top-full z-10 mt-2' : ''} ${
          showShadow
            ? 'shadow-[rgba(var(--primary-rgb),0.08)_0px_4px_16px,rgba(var(--primary-rgb),0.1)_0px_8px_32px]'
            : ''
        } ${isRounded ? 'rounded-lg' : ''}`}
      >
        <div className="min-h-0 overflow-hidden *:px-3 *:py-2">
          {typeof children === 'function' ? children({ close }) : children}
        </div>
      </div>
    </div>
  );
};
