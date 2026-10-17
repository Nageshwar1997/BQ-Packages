import Quill from 'quill';

import type { QuillToolbar } from './types.js';

/** A Quill format blot that has a `domNode`, which is all `toggleLinkId` needs of the link it finds. */
interface ILinkBlot {
  domNode: HTMLElement;
}

/** The label of the button that gives a link an `id`. */
export const LINK_ID_BUTTON_LABEL = 'Toggle the id of the link';

/**
 * Leaves the image button out of a toolbar: the editor can only hold the images it uploads on save when
 * it is given a place for them (`imagesRef`).
 */
export const withoutImageButton = (toolbar: QuillToolbar): QuillToolbar =>
  toolbar
    .map((group) => group.filter((item) => item !== 'image'))
    .filter((group) => group.length > 0);

/**
 * Gives the link at the cursor the `id`, or takes it off if it has it already. Nothing happens when
 * the cursor is not in a link.
 */
export const toggleLinkId = (quill: Quill, id: string): void => {
  const range = quill.getSelection();

  if (!range) {
    return;
  }

  // The link, not whatever is the innermost format at the cursor (a bold word in a link)
  const Link = Quill.import('formats/link') as Parameters<typeof quill.scroll.descendant>[0];
  const [link] = quill.scroll.descendant(Link, range.index) as [ILinkBlot | null, number];

  if (!link) {
    return;
  }

  if (link.domNode.getAttribute('id') === id) {
    link.domNode.removeAttribute('id');
  } else {
    link.domNode.setAttribute('id', id);
  }
};

/** The drawing of the button (a ring with a dot), in the colour the other buttons of the toolbar take. */
const LINK_ID_ICON = [
  '<svg xmlns="http://www.w3.org/2000/svg" width="18px" height="18px" viewBox="0 0 24 24" class="ql-fill" aria-hidden="true" focusable="false">',
  '<path fill="none" d="M0 0h24v24H0V0z"></path>',
  '<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8z"></path>',
  '<circle cx="12" cy="12" r="5"></circle>',
  '</svg>',
].join('');

/**
 * Adds the button that gives the selected link an `id` (and takes it off) at the end of the toolbar.
 *
 * @returns A function that takes the button away again.
 */
export const addLinkIdButton = (quill: Quill, id: string): (() => void) => {
  const toolbar = (quill.getModule('toolbar') as { container?: HTMLElement } | undefined)
    ?.container;

  if (!toolbar) {
    return () => undefined;
  }

  const section = document.createElement('span');
  const button = document.createElement('button');

  section.className = 'ql-formats';

  button.type = 'button';
  button.title = LINK_ID_BUTTON_LABEL;
  button.setAttribute('aria-label', LINK_ID_BUTTON_LABEL);
  button.innerHTML = LINK_ID_ICON;

  // Like the other buttons of the toolbar: pressing it must not take the cursor out of the text
  button.addEventListener('mousedown', (event) => {
    event.preventDefault();
  });
  button.addEventListener('click', () => {
    toggleLinkId(quill, id);
  });

  section.append(button);
  toolbar.append(section);

  return () => {
    section.remove();
  };
};
