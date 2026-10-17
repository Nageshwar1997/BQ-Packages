import { nanoid } from 'nanoid';
import type Quill from 'quill';

import { HEADING_IDS_DELAY_MS } from './constants.js';

/**
 * Gives every heading of the editor an `id` that it does not have yet, a moment after the last change
 * (so a page that shows the content can link to a heading).
 *
 * @returns `schedule` asks for it after the delay (asking again restarts the wait), `cancel` drops a
 * wait that is still going (when the editor goes away), `assign` does it now.
 */
export const createHeadingIds = (quill: Quill, delay = HEADING_IDS_DELAY_MS) => {
  let timer: ReturnType<typeof setTimeout> | undefined;

  const assign = () => {
    for (const heading of quill.root.querySelectorAll('h1, h2, h3, h4, h5, h6')) {
      if (!heading.id) {
        heading.id = nanoid();
      }
    }
  };

  return {
    assign,
    schedule: () => {
      clearTimeout(timer);
      timer = setTimeout(assign, delay);
    },
    cancel: () => {
      clearTimeout(timer);
      timer = undefined;
    },
  };
};
