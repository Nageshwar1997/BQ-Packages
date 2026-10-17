import { type ComponentPropsWithoutRef, useEffect, useRef } from 'react';

import { sanitizeQuillHtml } from './sanitize.js';

export interface QuillContentProps extends Omit<
  ComponentPropsWithoutRef<'div'>,
  'children' | 'dangerouslySetInnerHTML'
> {
  /** The HTML the editor saved. It is cleaned (see `sanitizeQuillHtml`) before it reaches the page. */
  content: string;
}

/*
 * The look of the saved content: the typography plugin's `prose` with the colours of the shop. The
 * class names are in this file (not in the app's css) so the viewer looks the same in every app; the
 * app lets Tailwind see them with `@import '@beautinique/frontend-quill/source.css'`.
 */
const PROSE_CLASS_NAME =
  'prose md:prose-sm lg:prose-md xl:prose-lg 2xl:prose-xl prose-headings:text-primary prose-headings:font-semibold prose-headings:my-3! prose-p:text-secondary prose-p:my-2! prose-p:leading-normal prose-a:text-fill-transparent prose-a:bg-accent-duo prose-strong:text-primary prose-em:text-secondary prose-ul:list-disc prose-ul:list-inside prose-ol:list-decimal prose-ol:list-inside prose-li:text-tertiary prose-li:my-1 prose-img:rounded-lg prose-img:w-full prose-img:h-full prose-img:object-contain prose-img:shadow-md prose-blockquote:border-l-4 prose-blockquote:border-primary/30 prose-blockquote:bg-primary/10 prose-blockquote:pl-4 prose-blockquote:italic prose-blockquote:text-secondary prose-code:bg-primary/10 prose-code:px-1 prose-code:py-0.5 prose-code:rounded-sm prose-code:text-sm prose-code:font-mono prose-code:text-primary-invert prose-pre:bg-primary-invert prose-pre:text-primary prose-pre:p-4 prose-pre:rounded-lg prose-pre:overflow-x-auto prose-table:table-auto prose-table:border-collapse prose-th:border-b prose-th:border-primary/30 prose-th:px-2 prose-th:py-1 prose-td:border-b prose-td:border-primary/30 prose-td:px-2 prose-td:py-1 w-full max-w-none cursor-default';

/**
 * Shows the HTML the editor saved, as the shop shows it.
 *
 * The HTML is cleaned right before it is written into the page, every time it changes: it is saved,
 * seller-written text that reaches every shopper who opens the page, so it is not trusted to have been
 * clean when it was saved. It is written after the first render (in an effect), so a page that is
 * rendered on a server and then hydrated has no difference to explain, and nothing of the content is
 * written where it cannot be cleaned.
 *
 * @example
 * <QuillContent content={product.description} className="lg:prose-sm!" />
 */
export const QuillContent = ({ content, className, ...rest }: QuillContentProps) => {
  const elementRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = elementRef.current;

    if (element) {
      // An empty value empties the box too: content that was replaced by nothing must not stay
      element.innerHTML = content ? sanitizeQuillHtml(content) : '';
    }
  }, [content]);

  return (
    <div
      {...rest}
      ref={elementRef}
      className={className ? `${PROSE_CLASS_NAME} ${className}` : PROSE_CLASS_NAME}
    />
  );
};
