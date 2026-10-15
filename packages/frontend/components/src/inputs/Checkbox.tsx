import {
  type ChangeEvent,
  type FocusEvent,
  type InputHTMLAttributes,
  type ReactNode,
  type Ref,
  useMemo,
} from 'react';

import { hasContent } from '../lib/content.js';
import { mergeRefs } from '../lib/mergeRefs.js';
import type { ITooltip } from '../types/component.js';
import { Tooltip } from '../ui/index.js';
import { InputError } from './InputError.js';
import type { IFieldBase, IFieldRegistration } from './types.js';
import { useFieldIds } from './useFieldIds.js';

export interface ICheckbox extends Omit<IFieldBase, 'label'> {
  /** The words next to the switch. They are its label: pressing them switches it, a screen reader reads them. */
  content?: ReactNode;
  /** Any attribute of the `<input>` except `type`: `name`, `checked`, `onChange`, `disabled`... */
  checkboxProps: Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>;
  /** What `register('name')` of React Hook Form gives back. */
  register?: IFieldRegistration;
  /** A tooltip on the switch (it shows when `required` is true). */
  tooltip?: Pick<ITooltip, 'required' | 'description' | 'title' | 'placement'>;
  /** The `<input>` itself, e.g. to move the focus to it. */
  ref?: Ref<HTMLInputElement>;
}

/**
 * An on / off switch with the words that say what it is for. It is a real checkbox (`role="switch"`),
 * so it works with the keyboard (Space) and with a form, and a screen reader says "on" or "off".
 */
export const Checkbox = ({
  register,
  className = '',
  content,
  checkboxProps,
  containerClassName = '',
  error = '',
  tooltip,
  ref,
}: ICheckbox) => {
  const { id, errorId, ...aria } = useFieldIds({
    id: checkboxProps.id,
    name: checkboxProps.name ?? register?.name,
    error,
    describedBy: checkboxProps['aria-describedby'],
  });

  const mergedRef = useMemo(
    () => mergeRefs<HTMLInputElement>(register?.ref, ref),
    [register?.ref, ref],
  );

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (checkboxProps.disabled) return;

    void register?.onChange(event);
    checkboxProps.onChange?.(event);
  };

  const handleBlur = (event: FocusEvent<HTMLInputElement>) => {
    checkboxProps.onBlur?.(event);
    void register?.onBlur(event);
  };

  return (
    <div className={`flex max-w-full min-w-0 flex-col gap-1.5 ${containerClassName}`}>
      <div className="flex items-center gap-2 sm:gap-3">
        <Tooltip
          title={tooltip?.title}
          description={tooltip?.description}
          placement={tooltip?.placement}
          required={tooltip?.required ?? false}
        >
          <label className="relative inline-block h-6 w-12 shrink-0">
            <input
              {...register}
              {...checkboxProps}
              {...aria}
              type="checkbox"
              role="switch"
              ref={mergedRef}
              id={id}
              onChange={handleChange}
              onBlur={handleBlur}
              className="peer sr-only"
            />
            <span
              aria-hidden="true"
              className={`border-primary/10 bg-tertiary-invert peer-checked:border-blue-crayola-c before:bg-silver-duo peer-checked:before:bg-accent-duo absolute inset-0 cursor-pointer rounded-full border transition-all duration-400 ease-[cubic-bezier(0.175,0.885,0.32,1.275)] peer-checked:shadow-[0_0_10px_rgba(var(--blue-crayola-c-rgb),0.8)] peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-blue-crayola-c peer-disabled:cursor-not-allowed peer-disabled:opacity-60 motion-reduce:transition-none before:absolute before:top-1/2 before:left-1 before:aspect-square before:h-[70%] before:-translate-y-1/2 before:rounded-full before:transition-all before:duration-400 before:ease-[cubic-bezier(0.23,1,0.32,1)] before:content-[''] motion-reduce:before:transition-none peer-checked:before:translate-x-[calc(150%)] ${className}`}
            />
          </label>
        </Tooltip>
        {hasContent(content) && (
          <label
            htmlFor={id}
            className="text-primary/50 cursor-pointer text-xs font-medium whitespace-break-spaces sm:text-[13px] md:text-sm"
          >
            {content}
          </label>
        )}
      </div>
      <InputError id={errorId} error={error} />
    </div>
  );
};
