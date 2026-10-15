// What can be reached with the Tab key. An element is left out when it is disabled, when it has
// `tabindex="-1"`, when it is `hidden` (or inside something that is, or that is `inert`) and for a
// hidden input.
const TABBABLE = [
  'a[href]',
  'area[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  'summary',
  'audio[controls]',
  'video[controls]',
  '[contenteditable]:not([contenteditable="false"])',
  '[tabindex]',
].join(',');

const isTabbable = (element: HTMLElement) => {
  if (element.tabIndex < 0) return false;

  return !element.closest('[hidden], [inert]');
};

/** The elements inside `root` that the Tab key stops on, in the order it goes through them. */
export const getTabbable = (root: HTMLElement) =>
  [...root.querySelectorAll<HTMLElement>(TABBABLE)].filter(isTabbable);
