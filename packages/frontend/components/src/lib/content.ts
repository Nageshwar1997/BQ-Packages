import type { ReactNode } from 'react';

/**
 * Whether React would show something for `content`. `null`, `undefined`, booleans and an empty string
 * show nothing; `0` does show (the text "0"), which is why this is not a plain truthiness check.
 */
export const hasContent = (content: ReactNode) =>
  content !== null &&
  content !== undefined &&
  content !== false &&
  content !== true &&
  content !== '';
