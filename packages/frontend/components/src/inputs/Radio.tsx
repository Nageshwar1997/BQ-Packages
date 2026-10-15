import { type ReactNode, useId } from 'react';

import type { IClassName, IContainerClassName } from '../types/component.js';
import { InputError } from './InputError.js';
import type { IFieldBase } from './types.js';

export interface IRadioOption {
  label: ReactNode;
  value: string;
}

export interface IRadio extends IClassName, IContainerClassName, Pick<IFieldBase, 'error'> {
  /** The value of the chosen option. A value that is not one of the options chooses none. */
  value: string;
  onChange: (value: string) => void;
  options: IRadioOption[];
  /** Names the group for assistive technology ("Gender"): the options are its only visible text. */
  label?: string;
  /** Groups the radios; one is made when it is not given. */
  name?: string;
  disabled?: boolean;
}

/**
 * A group of options of which one is chosen, drawn as a bar with a marker that slides to the chosen
 * one. It is a real radio group: the arrow keys move the choice, Tab leaves the group, and the
 * message under it is read with it.
 */
export const Radio = ({
  value,
  onChange,
  options,
  className = '',
  containerClassName = '',
  error = '',
  label,
  name,
  disabled = false,
}: IRadio) => {
  const generated = useId();
  const groupName = name ?? generated;
  const errorId = `${groupName}-error`;
  const index = options.findIndex((option) => option.value === value);

  return (
    <div className={`flex max-w-full min-w-0 flex-col gap-1.5 ${containerClassName}`}>
      <div
        role="radiogroup"
        aria-label={label}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        className={`border-battleship-davys-gray mx-auto flex w-full items-center justify-center gap-4 overflow-hidden rounded-full border ${className}`}
      >
        <div className="bg-smoke-eerie shadow-primary-btn hover:shadow-primary-btn-hover relative flex h-9 w-full items-center justify-between rounded-full transition-shadow duration-300">
          {/* the marker under the chosen option */}
          {index >= 0 && (
            <div
              aria-hidden="true"
              className="bg-accent-duo absolute h-full transform rounded-full shadow-lg transition-transform duration-300 ease-in-out motion-reduce:transition-none"
              style={{
                width: `${String(100 / options.length)}%`,
                transform: `translateX(${String(index * 100)}%)`,
              }}
            />
          )}

          {options.map((option) => (
            <label
              key={option.value}
              className={`has-focus-visible:outline-blue-crayola-c relative z-1 inline-block flex-1 rounded-full text-center text-sm has-focus-visible:outline-2 has-focus-visible:outline-offset-2 ${
                disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'
              } ${
                value === option.value
                  ? 'font-semibold text-white/90'
                  : 'text-primary/50 font-medium'
              }`}
            >
              <input
                type="radio"
                name={groupName}
                value={option.value}
                checked={value === option.value}
                disabled={disabled}
                onChange={() => {
                  onChange(option.value);
                }}
                className="sr-only"
              />
              {option.label}
            </label>
          ))}
        </div>
      </div>
      <InputError id={errorId} error={error} />
    </div>
  );
};
