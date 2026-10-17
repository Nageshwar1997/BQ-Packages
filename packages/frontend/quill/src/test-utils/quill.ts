import Quill from 'quill';
import { vi } from 'vitest';

import { registerQuillFormats } from '../editor/image-blot.js';

/*
 * What a browser has and jsdom does not, which Quill asks for when it moves the cursor (it scrolls the
 * cursor into view). Nothing is measured in a test, so a box of no size is the answer.
 */
const ZERO_RECT = { x: 0, y: 0, width: 0, height: 0, top: 0, right: 0, bottom: 0, left: 0 };

if (!('getBoundingClientRect' in Range.prototype)) {
  Object.assign(Range.prototype, {
    getBoundingClientRect: () => ({ ...ZERO_RECT, toJSON: () => ZERO_RECT }),
    getClientRects: () => [],
  });
}

/** A Quill editor on the page, made the way the package makes its own (with the image of the package). */
export const makeQuill = (html = '') => {
  registerQuillFormats();

  const host = document.createElement('div');
  const editorElement = document.createElement('div');

  host.append(editorElement);
  document.body.append(host);

  const quill = new Quill(editorElement, {
    theme: 'snow',
    modules: { toolbar: [['bold', 'link']] },
  });

  if (html) {
    quill.root.innerHTML = html;
    quill.update('silent');
  }

  return {
    quill,
    host,
    remove: () => {
      host.remove();
    },
  };
};

/** A file with the given name, size (in bytes) and type; the content is not the size, only `size` says it. */
export const fileOf = (name: string, size = 10, type = 'image/png') => {
  const file = new File(['x'], name, { type });

  Object.defineProperty(file, 'size', { value: size });

  return file;
};

/**
 * jsdom has no `URL.createObjectURL`. This gives it one that makes `blob:test/<n>` addresses, and
 * notes which were made and which were let go of.
 */
export const mockObjectUrls = () => {
  const created: string[] = [];
  const revoked: string[] = [];
  let next = 0;

  const create = vi.fn(() => {
    next += 1;

    const url = `blob:test/${String(next)}`;

    created.push(url);

    return url;
  });
  const revoke = vi.fn((url: string) => {
    revoked.push(url);
  });

  Object.assign(URL, { createObjectURL: create, revokeObjectURL: revoke });

  return { created, revoked, create, revoke };
};

/**
 * Replaces the file picker: `document.createElement('input')` still gives a real input, but its
 * `click()` does not open anything; the test picks files with the `pick` it gives back.
 */
export const mockFilePicker = () => {
  const pickers: HTMLInputElement[] = [];
  const click = vi.spyOn(HTMLInputElement.prototype, 'click').mockImplementation(function (
    this: HTMLInputElement,
  ) {
    pickers.push(this);
  });

  return {
    /** The inputs that were clicked, in order. */
    pickers,
    click,
    /** What the person does in the picker: choosing a file (or none) closes it with a `change`. */
    pick: (file: File | undefined, index = pickers.length - 1) => {
      const input = pickers.at(index);

      if (!input) {
        throw new Error('The file picker was not opened.');
      }

      Object.defineProperty(input, 'files', { value: file ? [file] : [], configurable: true });
      input.dispatchEvent(new Event('change'));
    },
  };
};
