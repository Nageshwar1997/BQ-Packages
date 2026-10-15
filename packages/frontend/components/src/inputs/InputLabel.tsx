import type { ComponentProps } from 'react';

import { hasContent } from '../lib/content.js';

/**
 * The label that sits on the top border of a field. It draws nothing when it has no text. Give it
 * `htmlFor` (the `id` of the field) so that pressing it focuses the field and a screen reader reads it
 * as the name of the field.
 */
export const InputLabel = ({
  children,
  className = '',
  htmlFor,
  ...labelProps
}: ComponentProps<'label'>) =>
  hasContent(children) ? (
    <label
      {...labelProps}
      htmlFor={htmlFor}
      className={`text-primary/50 border-primary/10 bg-smoke-eerie absolute top-0 left-3 -translate-y-1/2 transform rounded-sm border px-1 py-0.5 pt-1 text-[10px] leading-none md:px-2 ${htmlFor ? 'cursor-pointer' : 'cursor-default'} ${className}`}
    >
      {children}
    </label>
  ) : null;
