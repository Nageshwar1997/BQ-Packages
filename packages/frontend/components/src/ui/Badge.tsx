import type { ComponentProps, ReactNode } from 'react';

import { hasContent } from '../lib/content.js';

export interface IBadge extends Omit<ComponentProps<'span'>, 'children' | 'content'> {
  /**
   * What the badge shows: text, a number, or any React content (an icon, a few elements). A badge
   * with nothing to show (`null`, `undefined`, `false` or an empty string) renders nothing at all,
   * not an empty pill; `0` is something to show.
   */
  content: ReactNode;
}

const BASE_CSS =
  'border-primary/10 bg-primary/5 text-primary inline-flex w-fit items-center rounded-full border px-2.5 py-1 text-xs font-semibold whitespace-nowrap';

/** A small pill with a label, a count or a status. Any attribute of a `<span>` is passed on. */
export const Badge = ({ content, className = '', ...spanProps }: IBadge) =>
  hasContent(content) ? (
    <span {...spanProps} className={`${BASE_CSS} ${className}`}>
      {content}
    </span>
  ) : null;
