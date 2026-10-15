import '@beautinique/frontend-styles/color-input.css';

import { Icon } from '@iconify/react';
import { useId, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ColorPicker, type IColor } from 'react-color-palette';

import { type IFieldBase, InputError, InputLabel } from '../inputs/index.js';
import { getDropdownStyle, type TDropdownPlacement } from '../lib/dropdown-position.js';
import { mergeRefs } from '../lib/mergeRefs.js';
import { useAnchoredBox } from '../lib/useAnchoredBox.js';
import { useDismiss } from '../lib/useDismiss.js';
import { useFocusTrap } from '../lib/useFocusTrap.js';
import { isHexColor, isSameHex, toColor } from './color.js';
import { registerColorInputIcons } from './color-input-icons.js';

export interface IColorInput extends IFieldBase {
  /** The colour, in hexadecimal (`#ff00aa`). Anything else is shown as black. */
  value?: string;
  /** Gets the colour, in hexadecimal, as the person changes it. */
  onChange?: (value: string) => void;
  disabled?: boolean;
  /** What the field says while there is no `value`. */
  placeholder?: string;
  /** The `id` of the field, for something that has to point at it. */
  id?: string;
  /** Which side of the field the picker opens on, unless there is no room there. @default 'bottom' */
  position?: TDropdownPlacement;
  /** Leave out the slider and the field of the alpha (the transparency). @default false */
  hideAlpha?: boolean;
  /** The name of the picker for assistive technology, when the field has no `label`. @default 'Colour picker' */
  pickerLabel?: string;
}

// The tallest the picker gets: its area, its sliders and its fields.
const PICKER_HEIGHT = 340;

/**
 * A field that shows a colour and opens a picker to change it (`react-color-palette`, which this
 * entry needs: install it). The field is one button, so the keyboard reaches it; the picker is a
 * dialog that holds the focus until it is closed (Escape, a press outside, or the field again) and
 * gives it back. The sliders need a mouse or a finger; the fields in the picker (hex, rgb) do not:
 * the colour can be typed.
 *
 * The picker is drawn in `document.body`, so a parent that scrolls or hides what overflows does not
 * cut it; it opens on the other side when there is no room, and follows the field while the page
 * scrolls.
 */
export const ColorInput = ({
  label = '',
  value,
  error = '',
  disabled = false,
  placeholder,
  onChange,
  id,
  containerClassName = '',
  className = '',
  position = 'bottom',
  hideAlpha = false,
  pickerLabel = 'Colour picker',
}: IColorInput) => {
  registerColorInputIcons();

  const baseId = useId();
  const fieldId = id ?? `${baseId}-field`;
  const pickerId = `${baseId}-picker`;
  const errorId = `${baseId}-error`;

  const [isOpenState, setIsOpen] = useState(false);
  const [color, setColor] = useState<IColor>(() => toColor(value));
  const [seenValue, setSeenValue] = useState(value);
  const anchorRef = useRef<HTMLDivElement | null>(null);
  const pickerRef = useRef<HTMLDivElement | null>(null);

  // The app gave another colour: show it. Not when it is the colour the picker just gave it, because
  // writing it down again would lose the hue of a grey, which a hex cannot hold.
  if (value !== seenValue) {
    setSeenValue(value);

    if (!isSameHex(value, color.hex)) setColor(toColor(value));
  }

  // a field that is disabled while it is open closes, and stays closed when it is enabled again
  if (isOpenState && disabled) setIsOpen(false);

  const isOpen = isOpenState && !disabled;
  const box = useAnchoredBox({ isOpen, anchorRef, position, needed: PICKER_HEIGHT });
  const isShown = isOpen && box !== null;

  const containerRef = useDismiss<HTMLDivElement>(
    () => {
      setIsOpen(false);
    },
    { enabled: isOpen, ignore: [pickerRef] },
  );
  const trapRef = useFocusTrap<HTMLDivElement>({ enabled: isShown });
  const mergedPickerRef = useMemo(() => mergeRefs<HTMLDivElement>(pickerRef, trapRef), [trapRef]);

  const handleChange = (next: IColor) => {
    // text that is being typed can be no colour (`#GG0000`): the app is not told
    if (!isHexColor(next.hex)) return;

    setColor(next);
    onChange?.(next.hex);
  };

  return (
    <div
      ref={containerRef}
      className={`flex max-w-full min-w-0 flex-col gap-1.5 ${containerClassName}`}
    >
      <div className="relative" ref={anchorRef}>
        <InputLabel htmlFor={fieldId} className="z-2">
          {label}
        </InputLabel>
        <div
          data-invalid={error ? '' : undefined}
          className={`border-primary/10 bg-smoke-eerie focus-within:border-blue-crayola-c data-invalid:border-red-c flex items-center gap-1 overflow-hidden rounded-lg border px-3 text-[13px] ${className}`}
        >
          <button
            id={fieldId}
            type="button"
            aria-haspopup="dialog"
            aria-expanded={isOpen}
            aria-controls={isOpen ? pickerId : undefined}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? errorId : undefined}
            disabled={disabled}
            onClick={() => {
              setIsOpen(!isOpen);
            }}
            className={`text-primary flex min-w-0 flex-1 items-center gap-2 border-none bg-transparent text-left outline-hidden ${
              disabled ? 'cursor-no-drop' : 'cursor-pointer'
            }`}
          >
            <span
              aria-hidden="true"
              className="border-primary/10 rounded border p-0.5 xl:p-1"
              style={{ backgroundColor: color.hex }}
            >
              <Icon
                icon="mage:color-picker-fill"
                className="shrink-0 [&>path]:last:fill-primary-invert [&>path]:last:stroke-primary"
              />
            </span>
            <span className={`flex-1 truncate py-2 xl:py-3 ${value ? '' : 'text-primary/30'}`}>
              {value ? value.toUpperCase() : placeholder}
            </span>
            <Icon
              aria-hidden="true"
              icon={isOpen ? 'pepicons-pop:color-picker-off' : 'pepicons-pop:color-picker'}
              className="shrink-0"
            />
          </button>
        </div>
      </div>
      <InputError id={errorId} error={error} />
      {isShown &&
        createPortal(
          <div
            ref={mergedPickerRef}
            id={pickerId}
            role="dialog"
            tabIndex={-1}
            aria-label={label || pickerLabel}
            className="border-primary/10 bg-smoke-eerie fixed z-3 overflow-hidden rounded-lg border shadow-md outline-none"
            style={getDropdownStyle(box.rect, box.placement, window.innerHeight)}
          >
            <ColorPicker
              hideInput={['hsv']}
              hideAlpha={hideAlpha}
              color={color}
              onChange={handleChange}
            />
          </div>,
          document.body,
        )}
    </div>
  );
};
