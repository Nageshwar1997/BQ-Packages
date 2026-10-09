import type { IButton } from '../types/component.js';

type TPattern = IButton['pattern'];

// A `Record`: adding a pattern to the type is a type error here until it has a look.
const PATTERN_CSS: Record<TPattern, string> = {
  primary: 'text-white bg-sky-blue-burst shadow-primary-btn hover:shadow-primary-btn-hover',
  secondary:
    'text-secondary-invert bg-secondary shadow-secondary-btn hover:shadow-secondary-btn-hover',
  tertiary: 'text-tertiary-invert bg-tertiary shadow-tertiary-btn hover:shadow-tertiary-btn-hover',
  outline: 'text-primary border border-primary shadow-outline-btn hover:shadow-outline-btn-hover',
  transparent: 'bg-transparent border border-primary/30 text-secondary',
};

/** The look of a pattern; a pattern nobody knows (from code that is not type checked) is transparent. */
export const getButtonCss = (pattern: TPattern) =>
  Object.hasOwn(PATTERN_CSS, pattern) ? PATTERN_CSS[pattern] : PATTERN_CSS.transparent;
