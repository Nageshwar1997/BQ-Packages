import {
  type ChangeEvent,
  type FocusEvent,
  type InputHTMLAttributes,
  type Ref,
  useEffect,
  useMemo,
  useRef,
} from 'react';

import { mergeRefs } from '../lib/mergeRefs.js';
import { InputError } from './InputError.js';
import { InputIcon } from './InputIcon.js';
import { InputLabel } from './InputLabel.js';
import type { IFieldBase, IFieldRegistration, TInputIcons } from './types.js';
import { useFieldIds } from './useFieldIds.js';

export interface IInput extends IFieldBase {
  /** Any attribute of an `<input>`: `type`, `name`, `value`, `onChange`, `placeholder`, `disabled`... */
  inputProps: InputHTMLAttributes<HTMLInputElement>;
  /** An icon at each end of the field. One with an `onClick` is a button and needs a `label`. */
  icons?: TInputIcons;
  /** What `register('name')` of React Hook Form gives back. */
  register?: IFieldRegistration;
  /** Puts the cursor in the field when it is shown. */
  needRef?: boolean;
  /** The `<input>` itself, e.g. to move the focus to it. */
  ref?: Ref<HTMLInputElement>;
}

/**
 * A text field (any `type` of `<input>`) with its label on the top border, a message under it, and an
 * icon at each end.
 *
 * - The label is the name of the field: it is tied to it through `id` (the `id` of `inputProps`, or
 *   its `name`, or one made here), so pressing the label focuses the field and a screen reader reads it.
 * - While there is an `error` the field is `aria-invalid` and described by the message, which is
 *   said as soon as it shows up.
 * - Both `inputProps` and `register` are heard: `onChange` and `onBlur` of each are called.
 */
export const Input = ({
  label = '',
  register,
  className = '',
  error = '',
  containerClassName = '',
  icons,
  inputProps,
  needRef = false,
  ref,
}: IInput) => {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const { id, errorId, ...aria } = useFieldIds({
    id: inputProps.id,
    name: inputProps.name ?? register?.name,
    error,
    describedBy: inputProps['aria-describedby'],
  });

  const mergedRef = useMemo(
    () => mergeRefs<HTMLInputElement>(register?.ref, ref, inputRef),
    [register?.ref, ref],
  );

  useEffect(() => {
    if (needRef) inputRef.current?.focus();
  }, [needRef]);

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (inputProps.disabled) return;

    inputProps.onChange?.(event);
    void register?.onChange(event);
  };

  const handleBlur = (event: FocusEvent<HTMLInputElement>) => {
    inputProps.onBlur?.(event);
    void register?.onBlur(event);
  };

  return (
    <div className={`flex max-w-full min-w-0 flex-col gap-1.5 ${containerClassName}`}>
      <div className="relative">
        <InputLabel htmlFor={id}>{label}</InputLabel>
        <div
          data-invalid={error ? '' : undefined}
          className={`border-primary/10 bg-smoke-eerie focus-within:border-blue-crayola-c data-invalid:border-red-c flex items-center gap-3 overflow-hidden rounded-lg border px-3 ${className}`}
        >
          <InputIcon icon={icons?.left} />
          <input
            {...register}
            {...inputProps}
            {...aria}
            ref={mergedRef}
            id={id}
            onChange={handleChange}
            onBlur={handleBlur}
            onWheel={(event) => {
              inputProps.onWheel?.(event);
              // a number field that is scrolled over changes its value: let go of it instead
              if (inputProps.type === 'number') event.currentTarget.blur();
            }}
            className={`text-primary placeholder:text-primary/30 autofill-effect min-w-0 flex-1 border-none bg-transparent py-2 text-[13px] leading-normal outline-hidden placeholder:text-[13px] focus:border-none focus:outline-hidden disabled:cursor-not-allowed xl:py-3 ${inputProps.className ?? ''}`}
          />
          <InputIcon icon={icons?.right} />
        </div>
      </div>
      <InputError id={errorId} error={error} />
    </div>
  );
};
