import type { CSSProperties } from 'react';

import type { IClassName } from '../types/component.js';

export interface ILoadingText extends IClassName {
  /** What is written, with a shine that goes over its letters. @default 'Loading' */
  text?: string;
}

/**
 * The word "Loading" (or another), with a shine that goes over its letters while the app waits. The
 * shine is drawn by the `loading-text` utility of `@beautinique/frontend-styles` from the `data-text`
 * attribute, which a screen reader does not read, so the text is also written for it
 * (`role="status"`).
 */
export const LoadingText = ({ text = 'Loading', className = '' }: ILoadingText) => (
  <div role="status" className={`w-fit ${className}`}>
    <span className="sr-only">{text}</span>
    <div
      aria-hidden="true"
      data-text={text}
      className="loading-text after:text-primary/0 w-fit font-mono text-[3.5vmin] font-extrabold after:content-[attr(data-text)]"
      style={
        {
          '--loading-text-duration': `${String(Math.max(1, text.length * 0.08))}s`,
        } as CSSProperties
      }
    />
  </div>
);
