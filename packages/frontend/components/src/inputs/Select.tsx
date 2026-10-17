import { Icon } from '@iconify/react';
import {
  type KeyboardEvent,
  type ReactNode,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';

import {
  getDropdownPlacement,
  getDropdownStyle,
  type IDropdownRect,
  type TDropdownPlacement,
} from '../lib/dropdown-position.js';
import { scrollRowIntoView } from '../lib/scrollRowIntoView.js';
import { findEnabledIndex, findTypeaheadMatch } from '../lib/typeahead.js';
import { useDismiss } from '../lib/useDismiss.js';
import { InputError } from './InputError.js';
import { InputIcon } from './InputIcon.js';
import { registerInputIcons } from './inputs-icons.js';
import { InputLabel } from './InputLabel.js';
import type { IFieldBase, TInputIcons } from './types.js';

export interface ISelectOption {
  /** What is shown for the option, in the list and in the field once it is chosen. */
  label: ReactNode;
  value: string | number;
  /** The option is shown but cannot be chosen. */
  disabled?: boolean;
  /**
   * The text typing looks for when `label` is not text (an icon and a name). It is the label when that
   * is text.
   */
  searchLabel?: string;
}

export interface ISelectProps {
  /** The value of the chosen option. A value that is not one of the options chooses none. */
  value: ISelectOption['value'];
  /** Gets the value of the option that was chosen, and `''` when the choice was taken away. */
  onChange: (value: ISelectOption['value']) => void;
  disabled?: boolean;
  /** What the field says while nothing is chosen. */
  placeholder?: string;
  /** The `id` of the field, for something that has to point at it. */
  id?: string;
}

export interface ISelect extends IFieldBase {
  selectProps: ISelectProps;
  options: ISelectOption[];
  /** An icon at each end of the field. One with an `onClick` is a button and needs a `label`. */
  icons?: TInputIcons;
  /**
   * Classes for the list of options. The list is drawn in `document.body`, so for a field **inside a
   * modal** it needs a `z-` above the modal's: `optionsClassName="z-110"` (`ModalWrapper` is `z-100`, the
   * toasts are `z-999`). A bigger `z-` than the default (`z-3`) is the one that applies.
   */
  optionsClassName?: string;
  /** Which side of the field the list opens on, unless there is no room there. @default 'bottom' */
  position?: TDropdownPlacement;
  /** Pressing the chosen option again takes the choice away. @default true */
  clearable?: boolean;
}

interface IOpenList {
  rect: IDropdownRect;
  placement: TDropdownPlacement;
}

// The tallest the list gets (`max-h-60`) and the room its frame takes.
const LIST_MAX_HEIGHT = 240 + 10;
const TYPEAHEAD_RESET_MS = 700;

const labelTextOf = (option: ISelectOption) =>
  option.searchLabel ?? (typeof option.label === 'string' ? option.label : String(option.value));

/**
 * A field that opens a list of options. It follows the pattern of a select that is a combobox: the field
 * keeps the focus and tells assistive technology which option is the active one while the arrow
 * keys move through the list.
 *
 * - Keyboard: Arrow Down / Up (or Enter, Space) open it and move; Home / End jump to the first and the
 *   last; Enter or Space chooses; Escape or Tab close it; typing letters goes to the option that
 *   starts with them.
 * - The list is drawn in `document.body`, so it is not cut by a parent that scrolls or hides what
 *   overflows. It opens on the other side of the field when there is no room on the one asked for, and
 *   follows the field while the page scrolls.
 * - Pressing outside closes it. Pressing the chosen option again takes the choice away (`clearable`).
 */
export const Select = ({
  label = '',
  className = '',
  error = '',
  containerClassName = '',
  optionsClassName = '',
  icons,
  selectProps,
  options,
  position = 'bottom',
  clearable = true,
}: ISelect) => {
  registerInputIcons();

  const baseId = useId();
  const triggerId = selectProps.id ?? `${baseId}-field`;
  const listId = `${baseId}-list`;
  const errorId = `${baseId}-error`;
  const optionId = (index: number) => `${baseId}-option-${String(index)}`;

  const [isOpenState, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [list, setList] = useState<IOpenList | null>(null);

  const triggerBoxRef = useRef<HTMLDivElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const activeOptionRef = useRef<HTMLLIElement | null>(null);
  const listboxRef = useRef<HTMLUListElement | null>(null);
  const typedRef = useRef({ text: '', timer: 0 });

  const selectedIndex = options.findIndex((option) => option.value === selectProps.value);
  const optionAt = (index: number): ISelectOption | undefined =>
    index >= 0 && index < options.length ? options[index] : undefined;
  const selected = optionAt(selectedIndex);
  const hasValue = selected !== undefined && selected.value !== '';
  const canOpen = options.length > 0;
  // a field that is disabled while its list is open closes the list
  const isOpen = isOpenState && !selectProps.disabled;

  const containerRef = useDismiss<HTMLDivElement>(
    () => {
      setIsOpen(false);
    },
    { enabled: isOpen, ignore: [listRef] },
  );

  const open = (at: number) => {
    if (!canOpen) return;

    setActiveIndex(at);
    setIsOpen(true);
  };

  const close = () => {
    setIsOpen(false);
  };

  const choose = (index: number) => {
    const option = optionAt(index);

    if (!option || option.disabled || selectProps.disabled) return;

    selectProps.onChange(clearable && index === selectedIndex ? '' : option.value);
    close();
  };

  // Where the list is: under or over the field, as wide as it, and again whenever the page moves. It is
  // measured before the browser paints, so the list never shows in the wrong place for a moment.
  useLayoutEffect(() => {
    if (!isOpen) return;

    const update = () => {
      const box = triggerBoxRef.current;

      if (!box) return;

      const rect = box.getBoundingClientRect();
      const placement = getDropdownPlacement({
        rect,
        viewportHeight: window.innerHeight,
        desired: position,
        needed: Math.min(options.length * 32 + 8, LIST_MAX_HEIGHT),
      });

      setList({ rect, placement });
    };

    update();
    window.addEventListener('scroll', update, true);
    window.addEventListener('resize', update);

    return () => {
      window.removeEventListener('scroll', update, true);
      window.removeEventListener('resize', update);
    };
  }, [isOpen, position, options.length]);

  // The active option stays in view while the arrow keys move it.
  useEffect(() => {
    const row = activeOptionRef.current;
    const scroller = listboxRef.current;

    if (isOpen && scroller && row) scrollRowIntoView(scroller, row);
  }, [isOpen, activeIndex, list]);

  useEffect(() => {
    const typed = typedRef.current;

    return () => {
      window.clearTimeout(typed.timer);
    };
  }, []);

  const typeAhead = (character: string) => {
    const typed = typedRef.current;

    window.clearTimeout(typed.timer);
    typed.text += character;
    typed.timer = window.setTimeout(() => {
      typed.text = '';
    }, TYPEAHEAD_RESET_MS);

    const match = findTypeaheadMatch(
      options.map((option) => ({ label: labelTextOf(option), disabled: option.disabled })),
      typed.text,
      isOpen ? activeIndex : selectedIndex,
    );

    if (match === -1) return;

    if (isOpen) setActiveIndex(match);
    else open(match);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (selectProps.disabled || event.altKey || event.ctrlKey || event.metaKey) return;

    const first = findEnabledIndex(options, -1, 1);
    const last = findEnabledIndex(options, options.length, -1);

    switch (event.key) {
      case 'ArrowDown':
      case 'ArrowUp': {
        event.preventDefault();

        if (!isOpen) {
          open(selectedIndex !== -1 ? selectedIndex : event.key === 'ArrowDown' ? first : last);

          return;
        }

        const next = findEnabledIndex(options, activeIndex, event.key === 'ArrowDown' ? 1 : -1);

        if (next !== -1) setActiveIndex(next);

        return;
      }

      case 'Home':
      case 'End':
        event.preventDefault();

        if (isOpen) setActiveIndex(event.key === 'Home' ? first : last);
        else open(event.key === 'Home' ? first : last);

        return;

      case 'Enter':
      case ' ':
        event.preventDefault();

        if (isOpen) choose(activeIndex);
        else open(selectedIndex !== -1 ? selectedIndex : first);

        return;

      case 'Tab':
        close();

        return;

      default:
        // a letter, a digit: go to the option that starts with what was typed
        if (event.key.length === 1) {
          event.preventDefault();
          typeAhead(event.key);
        }
    }
  };

  return (
    <div
      ref={containerRef}
      className={`flex max-w-full min-w-0 flex-col gap-1.5 ${containerClassName}`}
    >
      <div className="relative" ref={triggerBoxRef}>
        <InputLabel htmlFor={triggerId} className="z-2">
          {label}
        </InputLabel>
        <div
          data-invalid={error ? '' : undefined}
          className={`border-primary/10 bg-smoke-eerie focus-within:border-blue-crayola-c data-invalid:border-red-c flex items-center gap-3 overflow-hidden rounded-lg border px-3 ${className}`}
        >
          <InputIcon icon={icons?.left} />
          <button
            id={triggerId}
            type="button"
            role="combobox"
            aria-haspopup="listbox"
            aria-expanded={isOpen}
            aria-controls={isOpen ? listId : undefined}
            aria-activedescendant={isOpen && activeIndex !== -1 ? optionId(activeIndex) : undefined}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? errorId : undefined}
            disabled={selectProps.disabled}
            onClick={() => {
              if (isOpen) close();
              else open(selectedIndex);
            }}
            onKeyDown={handleKeyDown}
            className={`text-primary flex min-w-0 flex-1 items-center justify-between gap-0.5 truncate border-none bg-transparent text-left text-[13px] outline-hidden ${
              selectProps.disabled ? 'cursor-no-drop' : 'cursor-pointer'
            }`}
          >
            <span
              className={`flex-1 truncate py-2 first-letter:capitalize xl:py-3 ${hasValue ? '' : 'text-primary/30'}`}
            >
              {selected?.label ?? selectProps.placeholder}
            </span>
            <Icon
              icon="solar:alt-arrow-down-linear"
              className={`size-4 transition-transform motion-reduce:transition-none md:size-5 ${
                isOpen ? 'rotate-180' : ''
              } ${hasValue ? 'text-primary' : 'text-primary/30'}`}
            />
          </button>
          <InputIcon icon={icons?.right} />
        </div>
      </div>
      <InputError id={errorId} error={error} />
      {isOpen &&
        list &&
        createPortal(
          // It is drawn in the body, so it is not in the stacking of a modal its field is in: it is behind
          // a modal (`ModalWrapper`, `z-100`) unless `optionsClassName` raises it (see there).
          <div
            ref={listRef}
            className={`border-primary/10 bg-smoke-eerie fixed z-3 overflow-hidden rounded-lg border shadow-md ${optionsClassName}`}
            style={getDropdownStyle(list.rect, list.placement, window.innerHeight)}
          >
            <ul
              id={listId}
              ref={listboxRef}
              role="listbox"
              aria-label={label || undefined}
              className="relative flex max-h-60 flex-col gap-0.5 overflow-auto p-1"
            >
              {options.map((option, index) => {
                const isSelected = index === selectedIndex;
                const isActive = index === activeIndex;

                return (
                  <li
                    key={option.value}
                    id={optionId(index)}
                    ref={isActive ? activeOptionRef : null}
                    role="option"
                    aria-selected={isSelected}
                    aria-disabled={option.disabled ? true : undefined}
                    className={`text-tertiary flex items-center justify-between gap-2 rounded-sm px-2 py-1.5 text-[13px] ${
                      option.disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
                    } ${isActive ? 'bg-primary/5' : ''} ${isSelected ? 'bg-primary/8' : ''}`}
                    onMouseMove={() => {
                      if (!option.disabled && !isActive) setActiveIndex(index);
                    }}
                    onClick={() => {
                      choose(index);
                    }}
                  >
                    <span className="flex-1 text-left text-[13px] first-letter:capitalize">
                      {option.label}
                    </span>
                    {isSelected && (
                      <Icon icon="solar:unread-linear" className="text-primary size-4 md:size-5" />
                    )}
                  </li>
                );
              })}
            </ul>
          </div>,
          document.body,
        )}
    </div>
  );
};
