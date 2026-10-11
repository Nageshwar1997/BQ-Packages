import type { ComponentProps } from 'react';

/**
 * Any attribute of an `<hr>` can be given (a `role`, `aria-*`, an `id`), but no children: an `<hr>`
 * is a void element, and React throws when it is given some.
 */
export type TDivider = Omit<ComponentProps<'hr'>, 'children' | 'dangerouslySetInnerHTML'>;

const BASE_CSS = 'bg-hr-line block h-px w-full border-none';

/**
 * A horizontal line between two parts of a page. It is an `<hr>`, so assistive technology reads it
 * as a separator; to hide it from them (a purely visual line) give it `aria-hidden`.
 */
export const Divider = ({ className = '', ...hrProps }: TDivider) => (
  <hr {...hrProps} className={`${BASE_CSS} ${className}`} />
);
