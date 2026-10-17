// @vitest-environment jsdom
import Quill, { Delta } from 'quill';
import { createRef, type RefObject } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { act } from 'react';
import { fileOf, mockFilePicker, mockObjectUrls } from '../test-utils/quill.js';
import { mount, unmountAll } from '../test-utils/react.js';
import { DEFAULT_QUILL_LINK_ID } from './constants.js';
import { LINK_ID_BUTTON_LABEL } from './toolbar.js';
import { QuillEditor } from './QuillEditor.js';
import type { QuillEditorError, QuillImageRef } from './types.js';

let objectUrls: ReturnType<typeof mockObjectUrls>;

beforeEach(() => {
  objectUrls = mockObjectUrls();
});

afterEach(() => {
  unmountAll();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

/** Mounts an editor and gives back what a test needs to look at it. */
const setup = (props: Parameters<typeof QuillEditor>[0] = {}, options?: { strict?: boolean }) => {
  const ref = createRef<Quill | null>();
  const view = mount(<QuillEditor ref={ref} {...props} />, options);
  const quill = () => {
    if (!ref.current) {
      throw new Error('The editor has no Quill yet.');
    }

    return ref.current;
  };

  return {
    ...view,
    ref,
    quill,
    box: view.container.firstElementChild as HTMLElement,
    rerender: (next: Parameters<typeof QuillEditor>[0]) => {
      view.rerender(<QuillEditor ref={ref} {...next} />);
    },
  };
};

const imageButton = (container: HTMLElement) =>
  container.querySelector<HTMLButtonElement>('.ql-toolbar button.ql-image');

describe('QuillEditor: what it makes', () => {
  it('makes one editor with a toolbar and a text, in a box that has the look of the shop', () => {
    const { box, quill } = setup();

    expect(quill()).toBeInstanceOf(Quill);
    expect(box.classList.contains('custom-editor')).toBe(true);
    expect(box.classList.contains('rounded-lg')).toBe(true);
    expect(box.querySelectorAll('.ql-toolbar')).toHaveLength(1);
    expect(box.querySelectorAll('.ql-editor')).toHaveLength(1);
    expect(
      quill().root.isContentEditable || quill().root.getAttribute('contenteditable') === 'true',
    ).toBe(true);
  });

  it('adds the classes it is given to the box', () => {
    const { box } = setup({ className: 'my-class' });

    expect(box.classList.contains('custom-editor')).toBe(true);
    expect(box.classList.contains('my-class')).toBe(true);
  });

  it('has the toolbar of the shop by default', () => {
    const { box } = setup({ imagesRef: { current: [] } });

    for (const name of [
      'bold',
      'italic',
      'underline',
      'strike',
      'link',
      'image',
      'video',
      'code',
      'clean',
    ]) {
      expect(box.querySelector(`.ql-toolbar button.ql-${name}`), name).not.toBeNull();
    }

    expect(box.querySelector('.ql-toolbar .ql-header')).not.toBeNull();
  });

  it('has the toolbar it is given instead', () => {
    const { box } = setup({ toolbar: [['bold']] });

    expect(box.querySelectorAll('.ql-toolbar button')).toHaveLength(2); // bold, and the link-id button
    expect(box.querySelector('button.ql-bold')).not.toBeNull();
    expect(box.querySelector('button.ql-italic')).toBeNull();
    expect(box.querySelector('.ql-header')).toBeNull();
  });

  it('shows the placeholder, and the default one when it has none', () => {
    expect(
      setup({ placeholder: 'Tell us more' }).quill().root.getAttribute('data-placeholder'),
    ).toBe('Tell us more');

    unmountAll();

    expect(setup().quill().root.getAttribute('data-placeholder')).toBe(
      'Write your content here...',
    );
  });

  it('changes the placeholder while it is there', () => {
    const { quill, rerender } = setup({ placeholder: 'One' });

    rerender({ placeholder: 'Two' });

    expect(quill().root.getAttribute('data-placeholder')).toBe('Two');
  });

  it('makes the editor once: another render does not make a new one', () => {
    const { quill, box, rerender } = setup({ placeholder: 'a' });
    const first = quill();
    const toolbar = box.querySelector('.ql-toolbar');

    rerender({ placeholder: 'b', onChange: () => undefined, toolbar: [['bold']], className: 'x' });
    rerender({ placeholder: 'c' });

    expect(quill()).toBe(first);
    expect(box.querySelector('.ql-toolbar')).toBe(toolbar);
    expect(box.querySelectorAll('.ql-editor')).toHaveLength(1);
  });

  it('works under StrictMode (the effects run twice): still one editor, and it works', () => {
    const onChange = vi.fn();
    const { box, quill } = setup({ onChange, imagesRef: { current: [] } }, { strict: true });

    expect(box.querySelectorAll('.ql-toolbar')).toHaveLength(1);
    expect(box.querySelectorAll('.ql-editor')).toHaveLength(1);
    expect(box.querySelectorAll(`button[aria-label="${LINK_ID_BUTTON_LABEL}"]`)).toHaveLength(1);
    expect(quill().root.isConnected).toBe(true);

    act(() => {
      quill().insertText(0, 'Hi', 'user');
    });

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith('<p>Hi</p>');
  });
});

describe('QuillEditor: the ref', () => {
  it('gives the Quill instance to an object ref, and takes it back when the editor goes away', () => {
    const { ref, unmount } = setup();

    expect(ref.current).toBeInstanceOf(Quill);

    unmount();

    expect(ref.current).toBeNull();
  });

  it('gives it to a function ref, and null when the editor goes away', () => {
    const calls: (Quill | null)[] = [];
    const view = mount(
      <QuillEditor
        ref={(quill) => {
          calls.push(quill);
        }}
      />,
    );

    expect(calls.at(-1)).toBeInstanceOf(Quill);

    view.unmount();

    expect(calls.at(-1)).toBeNull();
  });

  it('moves to another ref when the page gives one', () => {
    const first = createRef<Quill | null>();
    const second = createRef<Quill | null>();
    const view = mount(<QuillEditor ref={first} />);
    const quill = first.current;

    view.rerender(<QuillEditor ref={second} />);

    expect(first.current).toBeNull();
    expect(second.current).toBe(quill);
  });
});

describe('QuillEditor: onChange', () => {
  it('tells the page the HTML after every change', () => {
    const onChange = vi.fn<(html: string) => void>();
    const { quill } = setup({ onChange });

    act(() => {
      quill().insertText(0, 'Hello', 'user');
    });
    act(() => {
      quill().formatText(0, 5, 'bold', true, 'user');
    });

    expect(onChange.mock.calls.map(([html]) => html)).toEqual([
      '<p>Hello</p>',
      '<p><strong>Hello</strong></p>',
    ]);
  });

  it('calls the function of the last render, not the one it was made with', () => {
    const first = vi.fn();
    const second = vi.fn();
    const { quill, rerender } = setup({ onChange: first });

    rerender({ onChange: second });
    act(() => {
      quill().insertText(0, 'a', 'user');
    });

    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledWith('<p>a</p>');
  });

  it('does not need one', () => {
    const { quill } = setup();

    expect(() => {
      act(() => {
        quill().insertText(0, 'a', 'user');
      });
    }).not.toThrow();
  });
});

describe('QuillEditor: value', () => {
  it('shows the value it is given', () => {
    const { quill } = setup({ value: '<h2>Title</h2><p>Some <strong>text</strong></p>' });

    expect(quill().root.innerHTML).toBe('<h2>Title</h2><p>Some <strong>text</strong></p>');
  });

  it('cleans the value before it lands in the editor', () => {
    const { quill } = setup({
      value: '<p>a</p><img src="x" onerror="window.pwned = 1"><script>window.pwned = 1</script>',
    });

    expect(quill().root.querySelector('script')).toBeNull();
    expect(quill().root.innerHTML).not.toContain('onerror');
    expect(quill().root.innerHTML).not.toContain('pwned');
  });

  it('shows a new value when it changes from outside (a form that was reset)', () => {
    const { quill, rerender } = setup({ value: '<p>one</p>' });

    rerender({ value: '<p>two</p>' });
    expect(quill().root.innerHTML).toBe('<p>two</p>');

    rerender({ value: '' });
    expect(quill().getText()).toBe('\n');
  });

  it('does not report a value that the page set (only what a person does is a change)', () => {
    const onChange = vi.fn();
    const { quill, rerender } = setup({ onChange });

    rerender({ onChange, value: '<p>from outside</p>' });
    expect(quill().root.innerHTML).toBe('<p>from outside</p>');

    // not now, and not a moment later when Quill has read the DOM
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        expect(onChange).not.toHaveBeenCalled();
        resolve();
      }, 20);
    });
  });

  it('does not report the empty value it starts with', async () => {
    const onChange = vi.fn();

    setup({ onChange, value: '' });
    setup({ onChange, value: undefined });
    setup({ onChange, value: '<p><br></p>' });
    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(onChange).not.toHaveBeenCalled();
  });

  it('does not touch the editor when the value is only what the editor itself reported', () => {
    const { quill, rerender } = setup({ value: '<p>Hello world</p>' });

    act(() => {
      quill().insertText(5, '!', 'user');
    });
    act(() => {
      quill().setSelection(3, 0, 'silent');
    });

    const html = quill().root.innerHTML;
    const parse = vi.spyOn(DOMParser.prototype, 'parseFromString');

    // the page hands back what it just heard
    rerender({ value: html });

    expect(parse).not.toHaveBeenCalled(); // nothing was cleaned again
    expect(quill().getSelection()?.index).toBe(3); // and the cursor did not move
    expect(quill().root.innerHTML).toBe(html);
  });

  /** Counts how often the HTML of an element is set, from now until the returned `stop` is called. */
  const watchInnerHtml = () => {
    const descriptor = Object.getOwnPropertyDescriptor(Element.prototype, 'innerHTML');
    const sets: Element[] = [];

    if (!descriptor?.set) {
      throw new Error('This DOM has no innerHTML setter to watch.');
    }

    // The setter is called below with the element as `this`
    // eslint-disable-next-line @typescript-eslint/unbound-method
    const original: unknown = descriptor.set;

    Object.defineProperty(Element.prototype, 'innerHTML', {
      ...descriptor,
      set(this: Element, html: string) {
        sets.push(this);
        Reflect.apply(original as (html: string) => void, this, [html]);
      },
    });

    return {
      setsOn: (element: Element) => sets.filter((candidate) => candidate === element).length,
      stop: () => {
        Object.defineProperty(Element.prototype, 'innerHTML', descriptor);
      },
    };
  };

  it('does not set the text again when the value is what the editor already shows', () => {
    const { quill, rerender } = setup({ value: '<p>a</p>' });
    const watch = watchInnerHtml();

    try {
      act(() => {
        quill().setSelection(1, 0, 'silent');
      });
      rerender({ value: '<p>a</p>' });

      expect(watch.setsOn(quill().root)).toBe(0);
      expect(quill().getSelection()?.index).toBe(1);
    } finally {
      watch.stop();
    }
  });

  it('takes a text with nothing in it for what an empty editor shows: nothing is set', () => {
    // `''`, `undefined` and `<p><br></p>` are all "empty": the editor of an empty field must not be rewritten
    const { quill, rerender } = setup({ value: undefined });
    const watch = watchInnerHtml();

    try {
      rerender({ value: '' });
      rerender({ value: '<p><br></p>' });
      rerender({ value: undefined });

      expect(watch.setsOn(quill().root)).toBe(0);
    } finally {
      watch.stop();
    }
  });

  it('does set the text when the value is really another one', () => {
    const { quill, rerender } = setup({ value: '<p>a</p>' });
    const watch = watchInnerHtml();

    try {
      rerender({ value: '<p>b</p>' });

      expect(watch.setsOn(quill().root)).toBe(1);
      expect(quill().root.innerHTML).toBe('<p>b</p>');
    } finally {
      watch.stop();
    }
  });

  it('keeps an image from any host that the page puts in the value, without the check for what a person drags in', () => {
    const onError = vi.fn();
    const { quill } = setup({
      onError,
      value: '<p><img src="https://other.test/old.png" alt="old"></p>',
    });

    expect(quill().root.querySelector('img')?.getAttribute('src')).toBe(
      'https://other.test/old.png',
    );

    return new Promise<void>((resolve) => {
      setTimeout(() => {
        expect(onError).not.toHaveBeenCalled();
        expect(quill().root.querySelector('img')).not.toBeNull();
        resolve();
      }, 20);
    });
  });

  it('keeps the held images when the page sets a new value (they go with the editor or with the save)', () => {
    const imagesRef = { current: [] as QuillImageRef[] };
    const { quill, rerender } = setup({ imagesRef });

    imagesRef.current.push({ id: 'a', file: fileOf('a.png'), blobUrl: 'blob:test/9' });
    act(() => {
      quill().insertEmbed(0, 'image', { src: 'blob:test/9', alt: 'a', id: 'a' }, 'silent');
    });

    rerender({ imagesRef, value: '<p>reset</p>' });

    expect(imagesRef.current).toHaveLength(1);
    expect(objectUrls.revoked).toEqual([]);
  });
});

describe('QuillEditor: disabled', () => {
  it('can be written in by default, and not when disabled', () => {
    const { quill } = setup();

    expect(quill().isEnabled()).toBe(true);

    unmountAll();

    const disabled = setup({ disabled: true });

    expect(disabled.quill().isEnabled()).toBe(false);
    expect(disabled.quill().root.getAttribute('aria-readonly')).toBe('true');
  });

  it('follows the prop while it is there', () => {
    const { quill, rerender } = setup();

    rerender({ disabled: true });
    expect(quill().isEnabled()).toBe(false);
    expect(quill().root.getAttribute('aria-readonly')).toBe('true');

    rerender({ disabled: false });
    expect(quill().isEnabled()).toBe(true);
    expect(quill().root.hasAttribute('aria-readonly')).toBe(false);
  });
});

describe('QuillEditor: the link tooltip', () => {
  it('hides the link tooltip when the text scrolls (it would stay where it was)', () => {
    const { quill } = setup({ value: '<p><a href="https://shop.test">link</a></p>' });
    const tooltip = (quill().theme as unknown as { tooltip: { hide: () => void } }).tooltip;
    const hide = vi.spyOn(tooltip, 'hide');

    quill().root.dispatchEvent(new Event('scroll'));

    expect(hide).toHaveBeenCalledTimes(1);
  });
});

describe('QuillEditor: accessibility', () => {
  it('is a multi-line text box, and its toolbar is a toolbar with a name', () => {
    const { quill, box } = setup();

    expect(quill().root.getAttribute('role')).toBe('textbox');
    expect(quill().root.getAttribute('aria-multiline')).toBe('true');

    const toolbar = box.querySelector('.ql-toolbar');

    expect(toolbar?.getAttribute('role')).toBe('toolbar');
    expect(toolbar?.getAttribute('aria-label')).toBe('Text formatting');
  });

  it('has the name and the description the page gives it', () => {
    const { quill } = setup({
      'aria-label': 'Description',
      'aria-labelledby': 'label-id',
      'aria-describedby': 'error-id',
      'aria-invalid': true,
    });
    const root = quill().root;

    expect(root.getAttribute('aria-label')).toBe('Description');
    expect(root.getAttribute('aria-labelledby')).toBe('label-id');
    expect(root.getAttribute('aria-describedby')).toBe('error-id');
    expect(root.getAttribute('aria-invalid')).toBe('true');
  });

  it('changes and takes off those attributes with the props', () => {
    const { quill, rerender } = setup({ 'aria-invalid': true, 'aria-describedby': 'error-id' });

    rerender({ 'aria-invalid': false });

    expect(quill().root.getAttribute('aria-invalid')).toBe('false');
    expect(quill().root.hasAttribute('aria-describedby')).toBe(false);

    rerender({});

    expect(quill().root.hasAttribute('aria-invalid')).toBe(false);
  });

  it('has a name on every button of the toolbar that it adds', () => {
    const { box } = setup();

    expect(box.querySelector(`button[aria-label="${LINK_ID_BUTTON_LABEL}"]`)).not.toBeNull();
  });
});

describe('QuillEditor: the link id button', () => {
  it('is in the toolbar unless it is turned off', () => {
    expect(
      setup().box.querySelector(`button[aria-label="${LINK_ID_BUTTON_LABEL}"]`),
    ).not.toBeNull();

    unmountAll();

    expect(
      setup({ linkIdButton: false }).box.querySelector(
        `button[aria-label="${LINK_ID_BUTTON_LABEL}"]`,
      ),
    ).toBeNull();
  });

  it('gives the link at the cursor the id of the shop', () => {
    const { quill, box } = setup({ value: '<p>go <a href="https://shop.test">here</a></p>' });

    act(() => {
      quill().setSelection(5, 0, 'silent');
    });
    act(() => {
      box.querySelector<HTMLButtonElement>(`button[aria-label="${LINK_ID_BUTTON_LABEL}"]`)?.click();
    });

    expect(quill().root.querySelector('a')?.id).toBe(DEFAULT_QUILL_LINK_ID);
  });
});

describe('QuillEditor: images', () => {
  let picker: ReturnType<typeof mockFilePicker>;

  beforeEach(() => {
    picker = mockFilePicker();
  });

  it('has no image button when it has nowhere to hold the images', () => {
    expect(imageButton(setup().box)).toBeNull();
  });

  it('has the image button when it is given a place to hold them', () => {
    expect(imageButton(setup({ imagesRef: { current: [] } }).box)).not.toBeNull();
  });

  it('keeps the image button of a toolbar it is given, if it can hold the images', () => {
    const { box } = setup({ imagesRef: { current: [] }, toolbar: [['bold', 'image']] });

    expect(imageButton(box)).not.toBeNull();
  });

  it('puts a picked image in the text and holds its file', () => {
    const imagesRef = { current: [] as QuillImageRef[] };
    const onChange = vi.fn();
    const { box, quill } = setup({ imagesRef, onChange, value: '<p>Hello</p>' });
    const file = fileOf('photo.png');

    act(() => {
      quill().setSelection(5, 0, 'silent');
    });
    act(() => {
      imageButton(box)?.click();
    });
    act(() => {
      picker.pick(file);
    });

    expect(imagesRef.current).toHaveLength(1);
    expect(imagesRef.current[0]?.file).toBe(file);
    expect(quill().root.querySelector('img')?.getAttribute('src')).toBe(
      imagesRef.current[0]?.blobUrl,
    );
    expect(onChange).toHaveBeenLastCalledWith(quill().root.innerHTML);
  });

  it('keeps the picked image (a blob: address is allowed) and does not call it an error', () => {
    const imagesRef = { current: [] as QuillImageRef[] };
    const onError = vi.fn();
    const { box, quill } = setup({ imagesRef, onError });

    act(() => {
      imageButton(box)?.click();
    });
    act(() => {
      picker.pick(fileOf('photo.png'));
    });

    expect(onError).not.toHaveBeenCalled();
    expect(quill().root.querySelector('img')).not.toBeNull();
  });

  it('reports a file that is too big, with the rules it has, and does not insert it', () => {
    const imagesRef = { current: [] as QuillImageRef[] };
    const errors: QuillEditorError[] = [];
    const { box, quill } = setup({
      imagesRef,
      maxImageSize: 100,
      onError: (error) => errors.push(error),
    });

    act(() => {
      imageButton(box)?.click();
    });
    act(() => {
      picker.pick(fileOf('big.png', 101));
    });

    expect(errors).toMatchObject([{ type: 'image-too-large', size: 101, maxSize: 100 }]);
    expect(quill().root.querySelector('img')).toBeNull();
    expect(imagesRef.current).toEqual([]);
  });

  it('uses the image rules it is given', () => {
    const errors: QuillEditorError[] = [];
    const { box, quill } = setup({
      imagesRef: { current: [] },
      imageMimes: ['image/png'],
      imageFormats: ['png'],
      onError: (error) => errors.push(error),
    });

    act(() => {
      imageButton(box)?.click();
    });
    act(() => {
      picker.pick(fileOf('photo.jpg', 10, 'image/jpeg'));
    });

    expect(errors[0]).toMatchObject({
      type: 'image-invalid-type',
      extension: 'jpg',
      allowedFormats: ['png'],
    });
    expect(quill().root.querySelector('img')).toBeNull();
  });

  it('uses the ref and the error function of the last render', () => {
    const first = { current: [] as QuillImageRef[] };
    const second = { current: [] as QuillImageRef[] };
    const firstErrors = vi.fn();
    const secondErrors = vi.fn();
    const { box, rerender } = setup({ imagesRef: first, onError: firstErrors });

    rerender({ imagesRef: second, onError: secondErrors });
    act(() => {
      imageButton(box)?.click();
    });
    act(() => {
      picker.pick(fileOf('big.png', 99999999));
    });
    act(() => {
      imageButton(box)?.click();
    });
    act(() => {
      picker.pick(fileOf('ok.png'));
    });

    expect(firstErrors).not.toHaveBeenCalled();
    expect(secondErrors).toHaveBeenCalledTimes(1);
    expect(first.current).toEqual([]);
    expect(second.current).toHaveLength(1);
  });

  it('keeps an image that is deleted from the text, and brings it back working with an undo', () => {
    const imagesRef = { current: [] as QuillImageRef[] };
    const errors: QuillEditorError[] = [];
    const { box, quill } = setup({ imagesRef, onError: (error) => errors.push(error) });

    act(() => {
      imageButton(box)?.click();
    });
    act(() => {
      picker.pick(fileOf('photo.png'));
    });

    const blobUrl = imagesRef.current[0]?.blobUrl;

    // what Quill does when a second goes by: the deletion is an undo step of its own
    quill().history.cutoff();
    act(() => {
      quill().deleteText(0, 1, 'user');
    });

    // deleted from the text, but still held, and its blob: still works
    expect(quill().root.querySelector('img')).toBeNull();
    expect(imagesRef.current).toHaveLength(1);
    expect(objectUrls.revoked).toEqual([]);

    act(() => {
      quill().history.undo();
    });

    expect(quill().root.querySelector('img')?.getAttribute('src')).toBe(blobUrl);
    expect(imagesRef.current[0]?.blobUrl).toBe(blobUrl);
    expect(objectUrls.revoked).toEqual([]);
    expect(errors).toEqual([]); // a blob: image that comes back is not an image that was dragged in
  });

  it('lets go of the held images when the editor goes away', () => {
    const imagesRef = { current: [] as QuillImageRef[] };
    const { box, unmount } = setup({ imagesRef });

    act(() => {
      imageButton(box)?.click();
    });
    act(() => {
      picker.pick(fileOf('photo.png'));
    });

    const blobUrl = imagesRef.current[0]?.blobUrl;

    unmount();

    expect(imagesRef.current).toEqual([]);
    expect(objectUrls.revoked).toEqual([blobUrl]);
  });

  it('lets go of the list the page has now, not the one it had when the editor was made', () => {
    const first = { current: [] as QuillImageRef[] };
    const second = { current: [{ id: 'b', file: fileOf('b.png'), blobUrl: 'blob:test/77' }] };
    const { rerender, unmount } = setup({ imagesRef: first });

    rerender({ imagesRef: second });
    unmount();

    expect(second.current).toEqual([]);
    expect(objectUrls.revoked).toEqual(['blob:test/77']);
  });
});

describe('QuillEditor: images that a person did not pick with the button', () => {
  const imageFrom = (src: string) => new Delta().insert({ image: { src, alt: 'x' } });

  it('takes out an image from another site that is dragged or pasted in, and tells the page', () => {
    const errors: QuillEditorError[] = [];
    const { quill } = setup({ onError: (error) => errors.push(error) });

    act(() => {
      quill().updateContents(imageFrom('https://evil.test/a.png'), 'user');
    });

    expect(errors).toEqual([{ type: 'image-not-allowed' }]);
    expect(quill().root.querySelector('img')).toBeNull();
  });

  it('takes out an image that is a data: address', () => {
    const errors: QuillEditorError[] = [];
    const { quill } = setup({ onError: (error) => errors.push(error) });

    act(() => {
      quill().updateContents(imageFrom('data:image/png;base64,AAAA'), 'user');
    });

    expect(errors).toHaveLength(1);
    expect(quill().root.querySelector('img')).toBeNull();
  });

  it('lets an image from the host of the shop be, also when a person brings it back (an undo)', () => {
    const errors: QuillEditorError[] = [];
    const { quill } = setup({ onError: (error) => errors.push(error) });

    act(() => {
      quill().updateContents(imageFrom('https://res.cloudinary.com/shop/a.png'), 'user');
    });

    expect(errors).toEqual([]);
    expect(quill().root.querySelector('img')?.getAttribute('src')).toBe(
      'https://res.cloudinary.com/shop/a.png',
    );
  });

  it('is about the hosts it is given', () => {
    const errors: QuillEditorError[] = [];
    const { quill } = setup({
      allowedImageHosts: ['cdn.shop.test'],
      onError: (error) => errors.push(error),
    });

    act(() => {
      quill().updateContents(imageFrom('https://cdn.shop.test/a.png'), 'user');
    });
    expect(errors).toEqual([]);

    act(() => {
      quill().updateContents(
        new Delta().retain(1).insert({ image: { src: 'https://res.cloudinary.com/b.png' } }),
        'user',
      );
    });
    expect(errors).toEqual([{ type: 'image-not-allowed' }]);
  });

  it('does not check what the page does through the API (only what a person does)', () => {
    const errors: QuillEditorError[] = [];
    const { quill } = setup({ onError: (error) => errors.push(error) });

    act(() => {
      quill().updateContents(imageFrom('https://evil.test/a.png'), 'api');
    });

    expect(errors).toEqual([]);
    expect(quill().root.querySelector('img')).not.toBeNull();
  });

  it('does not need an error function to take the image out', () => {
    const { quill } = setup();

    act(() => {
      quill().updateContents(imageFrom('https://evil.test/a.png'), 'user');
    });

    expect(quill().root.querySelector('img')).toBeNull();
  });

  it('does not take a pasted image in', () => {
    const { quill } = setup();
    const delta = quill().clipboard.convert({
      html: '<p>text<img src="https://res.cloudinary.com/shop/a.png"></p>',
    });

    expect(JSON.stringify(delta)).toContain('text');
    expect(JSON.stringify(delta)).not.toContain('image');
  });

  it('does not take the colours of a pasted text in', () => {
    const { quill } = setup();
    const delta = quill().clipboard.convert({
      html: '<p><strong style="color: rgb(255, 0, 0); background-color: rgb(0, 255, 0)">pasted</strong></p>',
    });
    const [op] = delta.ops;

    expect(op.insert).toBe('pasted');
    expect(op.attributes).toMatchObject({ bold: true });
    expect(op.attributes).not.toHaveProperty('color');
    expect(op.attributes).not.toHaveProperty('background');
  });
});

describe('QuillEditor: heading ids', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  const typeHeading = (quill: Quill) => {
    act(() => {
      quill.insertText(0, 'Title\n', 'user');
      quill.formatLine(0, 1, 'header', 2, 'user');
    });
  };

  it('gives a heading an id a moment after the change', () => {
    const { quill } = setup();

    typeHeading(quill());
    expect(quill().root.querySelector('h2')?.id).toBe('');

    act(() => {
      vi.advanceTimersByTime(200);
    });

    expect(quill().root.querySelector('h2')?.id).toBeTruthy();
  });

  it('does not, when it is turned off', () => {
    const { quill } = setup({ headingIds: false });

    typeHeading(quill());
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(quill().root.querySelector('h2')?.id).toBe('');
  });

  it('gives the headings of a value the page set an id too', () => {
    const { quill } = setup({ value: '<h3>Saved</h3><p>text</p>' });

    act(() => {
      vi.advanceTimersByTime(200);
    });

    expect(quill().root.querySelector('h3')?.id).toBeTruthy();
  });

  it('stops waiting when the editor goes away', () => {
    const { quill, unmount } = setup();

    typeHeading(quill());
    unmount();

    expect(vi.getTimerCount()).toBe(0);
  });
});

describe('QuillEditor: the editor goes away', () => {
  it('leaves nothing in the box and nothing on the page', () => {
    const { box, unmount, container } = setup();

    unmount();

    expect(box.childElementCount).toBe(0);
    expect(container.isConnected).toBe(false);
    expect(document.querySelector('.ql-toolbar')).toBeNull();
  });
});

describe('QuillEditor: the types reject wrong use', () => {
  it('(checked by tsc, not run)', () => {
    const imagesRef: RefObject<QuillImageRef[]> = { current: [] };

    // @ts-expect-error - the image rules are lists of strings
    <QuillEditor imageMimes={[1, 2]} />;
    // @ts-expect-error - the error function takes an error of the editor
    <QuillEditor onError={(error: string) => error} />;
    // @ts-expect-error - the images are held in a list of images
    <QuillEditor imagesRef={{ current: 'no' }} />;
    // @ts-expect-error - a value is HTML, a string
    <QuillEditor value={5} />;
    <QuillEditor imagesRef={imagesRef} />;

    expect(true).toBe(true);
  });
});
