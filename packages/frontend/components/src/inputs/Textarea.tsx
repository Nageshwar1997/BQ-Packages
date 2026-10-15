import {
  type ChangeEvent,
  type FocusEvent,
  type Ref,
  type TextareaHTMLAttributes,
  useEffect,
  useMemo,
  useRef,
} from 'react';

import { mergeRefs } from '../lib/mergeRefs.js';
import { InputError } from './InputError.js';
import { InputLabel } from './InputLabel.js';
import type { IFieldBase, IFieldRegistration } from './types.js';
import { useFieldIds } from './useFieldIds.js';

export interface ITextarea extends IFieldBase {
  /** Any attribute of a `<textarea>`: `name`, `value`, `onChange`, `placeholder`, `rows`... */
  textAreaProps: TextareaHTMLAttributes<HTMLTextAreaElement>;
  /** What `register('name')` of React Hook Form gives back. */
  register?: IFieldRegistration<HTMLTextAreaElement>;
  /** Puts the cursor in the field when it is shown. */
  needRef?: boolean;
  /** The `<textarea>` itself, e.g. to move the focus to it. */
  ref?: Ref<HTMLTextAreaElement>;
}

/**
 * A multi-line text field: the same as `Input` (label on the border, message under it, `register`
 * and `textAreaProps` both heard, `aria-invalid` and `aria-describedby` while there is an `error`),
 * five rows tall unless `rows` says otherwise.
 */
export const Textarea = ({
  label = '',
  register,
  className = '',
  error = '',
  containerClassName = '',
  textAreaProps,
  needRef = false,
  ref,
}: ITextarea) => {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const { id, errorId, ...aria } = useFieldIds({
    id: textAreaProps.id,
    name: textAreaProps.name ?? register?.name,
    error,
    describedBy: textAreaProps['aria-describedby'],
  });

  const mergedRef = useMemo(
    () => mergeRefs<HTMLTextAreaElement>(register?.ref, ref, textareaRef),
    [register?.ref, ref],
  );

  useEffect(() => {
    if (needRef) textareaRef.current?.focus();
  }, [needRef]);

  const handleChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    if (textAreaProps.disabled) return;

    textAreaProps.onChange?.(event);
    void register?.onChange(event);
  };

  const handleBlur = (event: FocusEvent<HTMLTextAreaElement>) => {
    textAreaProps.onBlur?.(event);
    void register?.onBlur(event);
  };

  return (
    <div className={`flex max-w-full min-w-0 flex-col gap-1.5 ${containerClassName}`}>
      <div className="relative">
        <InputLabel htmlFor={id}>{label}</InputLabel>
        <div
          data-invalid={error ? '' : undefined}
          className={`border-primary/10 bg-smoke-eerie focus-within:border-blue-crayola-c data-invalid:border-red-c overflow-hidden rounded-lg border ${className}`}
        >
          <textarea
            {...register}
            {...textAreaProps}
            {...aria}
            ref={mergedRef}
            id={id}
            rows={textAreaProps.rows ?? 5}
            onChange={handleChange}
            onBlur={handleBlur}
            className={`text-primary placeholder:text-primary/30 autofill-effect block w-full resize-y border-none bg-transparent px-3 py-2 text-[13px] leading-normal outline-hidden placeholder:text-[13px] focus:border-none focus:outline-hidden disabled:cursor-not-allowed xl:py-3 ${textAreaProps.className ?? ''}`}
          />
        </div>
      </div>
      <InputError id={errorId} error={error} />
    </div>
  );
};
