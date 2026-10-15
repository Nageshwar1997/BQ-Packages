import { useId } from 'react';

interface IFieldIdsOptions {
  /** The `id` of the field, when the app gave one. */
  id?: string;
  /** Its `name`: it is the `id` when there is no other. */
  name?: string;
  /** The message under the field. */
  error?: string;
  /** What the field is already described by (an `aria-describedby` of the app). */
  describedBy?: string;
}

/**
 * What a field needs to be understood by assistive technology: an `id` for its label to point at, an
 * id for its message, and the attributes that say it is invalid and that the message describes it.
 * The `id` is the one the app gave, then the `name`, then one made here: a field with no name of its
 * own still gets a label that works.
 */
export const useFieldIds = ({ id, name, error, describedBy }: IFieldIdsOptions) => {
  const generated = useId();
  const fieldId = id ?? name ?? generated;
  const errorId = `${fieldId}-error`;

  return {
    id: fieldId,
    errorId,
    'aria-invalid': error ? (true as const) : undefined,
    'aria-describedby':
      [describedBy, error ? errorId : undefined].filter(Boolean).join(' ') || undefined,
  };
};
