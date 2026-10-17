// @vitest-environment jsdom
import { Delta } from 'quill';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { makeQuill } from '../test-utils/quill.js';
import { removePastedStyles } from './clipboard.js';
import { DEFAULT_QUILL_LINK_ID, DEFAULT_QUILL_TOOLBAR } from './constants.js';
import { describeQuillEditorError } from './errors.js';
import { createHeadingIds } from './heading-ids.js';
import {
  addLinkIdButton,
  LINK_ID_BUTTON_LABEL,
  toggleLinkId,
  withoutImageButton,
} from './toolbar.js';
import type { QuillEditorError } from './types.js';

describe('removePastedStyles', () => {
  it('takes the colours out of a pasted text and keeps the other formats', () => {
    const delta = new Delta()
      .insert('a', { bold: true, color: '#ff0000', background: '#00ff00' })
      .insert('b', { italic: true, 'background-color': 'red', 'background-image': 'url(x)' });

    expect(removePastedStyles(delta).ops).toEqual([
      { insert: 'a', attributes: { bold: true } },
      { insert: 'b', attributes: { italic: true } },
    ]);
  });

  it('leaves text without formats, and embeds, alone', () => {
    const delta = new Delta().insert('plain').insert({ image: 'blob:x' });

    expect(removePastedStyles(delta).ops).toEqual([
      { insert: 'plain' },
      { insert: { image: 'blob:x' } },
    ]);
  });

  it('changes the delta it is given and gives it back', () => {
    const delta = new Delta().insert('a', { color: 'red' });

    expect(removePastedStyles(delta)).toBe(delta);
    expect(delta.ops[0]?.attributes).toEqual({});
  });
});

describe('withoutImageButton', () => {
  it('takes the image button out, in the group it is in', () => {
    expect(withoutImageButton([['bold'], ['link', 'image', 'video']])).toEqual([
      ['bold'],
      ['link', 'video'],
    ]);
  });

  it('takes a group away when the image button was all that was in it', () => {
    expect(withoutImageButton([['bold'], ['image'], ['clean']])).toEqual([['bold'], ['clean']]);
  });

  it('leaves a toolbar that has no image button as it is', () => {
    expect(withoutImageButton([['bold'], [{ header: [1, 2] }]])).toEqual([
      ['bold'],
      [{ header: [1, 2] }],
    ]);
  });

  it('does not change the toolbar it is given (the default one is shared)', () => {
    const before = JSON.stringify(DEFAULT_QUILL_TOOLBAR);

    withoutImageButton(DEFAULT_QUILL_TOOLBAR);

    expect(JSON.stringify(DEFAULT_QUILL_TOOLBAR)).toBe(before);
    expect(JSON.stringify(DEFAULT_QUILL_TOOLBAR)).toContain('"image"');
  });
});

describe('the default toolbar', () => {
  it('has the buttons the shop has always had', () => {
    const buttons = DEFAULT_QUILL_TOOLBAR.flat().map((item) =>
      typeof item === 'string' ? item : Object.keys(item)[0],
    );

    expect(buttons).toEqual([
      'header',
      'bold',
      'italic',
      'underline',
      'strike',
      'color',
      'background',
      'list',
      'list',
      'script',
      'script',
      'indent',
      'indent',
      'align',
      'direction',
      'link',
      'image',
      'video',
      'code',
      'clean',
    ]);
  });
});

describe('toggleLinkId', () => {
  let remove: () => void;

  afterEach(() => {
    remove();
  });

  const setup = (html: string) => {
    const made = makeQuill(html);

    remove = made.remove;

    return made.quill;
  };

  it('gives the link at the cursor the id', () => {
    const quill = setup('<p>go <a href="https://shop.test">here</a> now</p>');

    quill.setSelection(5, 0);
    toggleLinkId(quill, 'my-id');

    expect(quill.root.querySelector('a')?.id).toBe('my-id');
  });

  it('takes the id off when the link has it already', () => {
    const quill = setup('<p>go <a href="https://shop.test" id="my-id">here</a> now</p>');

    quill.setSelection(5, 0);
    toggleLinkId(quill, 'my-id');

    expect(quill.root.querySelector('a')?.hasAttribute('id')).toBe(false);
  });

  it('replaces another id with this one', () => {
    const quill = setup('<p><a href="https://shop.test" id="other">here</a></p>');

    quill.setSelection(1, 0);
    toggleLinkId(quill, 'my-id');

    expect(quill.root.querySelector('a')?.id).toBe('my-id');
  });

  it('finds the link when the text at the cursor is also bold (the link, not the bold)', () => {
    const quill = setup('<p><a href="https://shop.test"><strong>bold link</strong></a></p>');

    quill.setSelection(3, 0);
    toggleLinkId(quill, 'my-id');

    expect(quill.root.querySelector('a')?.id).toBe('my-id');
    expect(quill.root.querySelector('strong')?.hasAttribute('id')).toBe(false);
  });

  it('does nothing when the cursor is not in a link', () => {
    const quill = setup('<p>plain <a href="https://shop.test">link</a></p>');

    quill.setSelection(2, 0);
    toggleLinkId(quill, 'my-id');

    expect(quill.root.querySelector('[id]')).toBeNull();
  });

  it('does nothing when there is no cursor', () => {
    const quill = setup('<p><a href="https://shop.test">link</a></p>');

    quill.blur();
    toggleLinkId(quill, 'my-id');

    expect(quill.root.querySelector('[id]')).toBeNull();
  });
});

describe('addLinkIdButton', () => {
  let made: ReturnType<typeof makeQuill>;

  beforeEach(() => {
    made = makeQuill('<p><a href="https://shop.test">link</a></p>');
  });

  afterEach(() => {
    made.remove();
  });

  const buttonOf = () =>
    made.host.querySelector<HTMLButtonElement>(
      `.ql-toolbar button[aria-label="${LINK_ID_BUTTON_LABEL}"]`,
    );

  it('adds a button with a name at the end of the toolbar, in a group like the others', () => {
    addLinkIdButton(made.quill, DEFAULT_QUILL_LINK_ID);

    const button = buttonOf();

    expect(button).not.toBeNull();
    expect(button?.type).toBe('button');
    expect(button?.title).toBe(LINK_ID_BUTTON_LABEL);
    expect(button?.parentElement?.className).toBe('ql-formats');
    expect(button?.parentElement).toBe(made.host.querySelector('.ql-toolbar')?.lastElementChild);
    // the drawing is for the eyes only
    expect(button?.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
  });

  it('gives the link at the cursor the id when it is pressed, and takes it off the next time', () => {
    addLinkIdButton(made.quill, 'my-id');
    made.quill.setSelection(1, 0);

    buttonOf()?.click();
    expect(made.quill.root.querySelector('a')?.id).toBe('my-id');

    buttonOf()?.click();
    expect(made.quill.root.querySelector('a')?.hasAttribute('id')).toBe(false);
  });

  it('does not take the cursor out of the text when it is pressed', () => {
    addLinkIdButton(made.quill, 'my-id');

    const event = new MouseEvent('mousedown', { bubbles: true, cancelable: true });

    buttonOf()?.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(true);
  });

  it('takes the button away with the function it gives back', () => {
    const removeButton = addLinkIdButton(made.quill, 'my-id');

    removeButton();

    expect(buttonOf()).toBeNull();
    expect(made.host.querySelectorAll('.ql-toolbar .ql-formats')).toHaveLength(1); // the group went too
  });
});

describe('createHeadingIds', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const setup = (html: string) => {
    const made = makeQuill(html);

    return { ...made, headings: createHeadingIds(made.quill, 200) };
  };

  it('gives the headings without an id one, a moment after it is asked', () => {
    const { quill, headings, remove } = setup('<h1>One</h1><h3>Three</h3><p>text</p>');

    headings.schedule();
    expect(quill.root.querySelector('h1')?.id).toBe('');

    vi.advanceTimersByTime(199);
    expect(quill.root.querySelector('h1')?.id).toBe('');

    vi.advanceTimersByTime(1);
    expect(quill.root.querySelector('h1')?.id).toBeTruthy();
    expect(quill.root.querySelector('h3')?.id).toBeTruthy();
    expect(quill.root.querySelector('p')?.hasAttribute('id')).toBe(false);
    remove();
  });

  it('gives each heading an id of its own', () => {
    const { quill, headings, remove } = setup('<h2>A</h2><h2>B</h2><h4>C</h4>');

    headings.assign();

    const ids = Array.from(quill.root.querySelectorAll('h2, h4'), (heading) => heading.id);

    expect(new Set(ids).size).toBe(3);
    expect(ids.every(Boolean)).toBe(true);
    remove();
  });

  it('keeps the id a heading already has', () => {
    const { quill, headings, remove } = setup('<h2 id="mine">A</h2>');

    headings.assign();

    expect(quill.root.querySelector('h2')?.id).toBe('mine');
    remove();
  });

  it('waits again each time it is asked, so it works once after a burst of changes', () => {
    const { quill, headings, remove } = setup('<h2>A</h2>');

    headings.schedule();
    vi.advanceTimersByTime(150);
    headings.schedule();
    vi.advanceTimersByTime(150);
    expect(quill.root.querySelector('h2')?.id).toBe('');

    vi.advanceTimersByTime(50);
    expect(quill.root.querySelector('h2')?.id).toBeTruthy();
    remove();
  });

  it('does not do it when the wait is dropped (the editor went away)', () => {
    const { quill, headings, remove } = setup('<h2>A</h2>');

    headings.schedule();
    headings.cancel();
    vi.advanceTimersByTime(1000);

    expect(quill.root.querySelector('h2')?.id).toBe('');
    expect(vi.getTimerCount()).toBe(0);
    remove();
  });

  it('is fine with a drop when nothing is waiting', () => {
    const { headings, remove } = setup('<h2>A</h2>');

    expect(() => {
      headings.cancel();
    }).not.toThrow();
    remove();
  });
});

describe('describeQuillEditorError', () => {
  it('says how big the image is and how big it may be', () => {
    const error: QuillEditorError = {
      type: 'image-too-large',
      file: new File([], 'a.png'),
      size: 3 * 1024 * 1024,
      maxSize: 2 * 1024 * 1024,
    };

    expect(describeQuillEditorError(error)).toEqual({
      title: 'File size limit exceeded',
      description: 'Image size is 3 MB. Max allowed size is 2 MB.',
    });
  });

  it('says which extension the file has and which are allowed', () => {
    const file = new File([], 'a.pdf');

    expect(
      describeQuillEditorError({
        type: 'image-invalid-type',
        file,
        extension: 'pdf',
        allowedFormats: ['png', 'jpg'],
      }),
    ).toEqual({
      title: 'Invalid file type',
      description: 'File extension is .pdf. Allowed extensions are png, jpg.',
    });
  });

  it('says "unknown" when the file has no extension', () => {
    expect(
      describeQuillEditorError({
        type: 'image-invalid-type',
        file: new File([], 'a'),
        extension: undefined,
        allowedFormats: ['png'],
      }).description,
    ).toBe('File extension is .unknown. Allowed extensions are png.');
  });

  it('tells where images may come from when one was dragged or pasted in', () => {
    expect(describeQuillEditorError({ type: 'image-not-allowed' })).toEqual({
      title: 'You cannot copy, drag & drop images here.',
      description: 'Please upload it using the upload image button.',
    });
  });
});
