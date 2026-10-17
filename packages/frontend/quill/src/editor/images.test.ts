// @vitest-environment jsdom
import { Delta } from 'quill';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { fileOf, makeQuill, mockFilePicker, mockObjectUrls } from '../test-utils/quill.js';
import {
  getQuillImageFiles,
  getQuillImagesInText,
  hasForbiddenImage,
  insertImageIntoQuill,
  validateImageFile,
} from './images.js';
import type { QuillEditorError, QuillImageRef } from './types.js';

const RULES = {
  maxSize: 100,
  mimes: ['image/png', 'image/jpeg'],
  formats: ['png', 'jpg', 'jpeg'],
};

describe('validateImageFile', () => {
  it('accepts an image of an allowed type and size', () => {
    expect(validateImageFile(fileOf('a.png', 50, 'image/png'), RULES)).toBeNull();
  });

  it('accepts one of exactly the biggest size (only more is too big)', () => {
    expect(validateImageFile(fileOf('a.png', 100), RULES)).toBeNull();
    expect(validateImageFile(fileOf('a.png', 101), RULES)).toMatchObject({
      type: 'image-too-large',
      size: 101,
      maxSize: 100,
    });
  });

  it('says "too big" before "wrong type" when it is both', () => {
    expect(validateImageFile(fileOf('a.txt', 500, 'text/plain'), RULES)?.type).toBe(
      'image-too-large',
    );
  });

  it('refuses a type that is not allowed, with the extension it has', () => {
    const file = fileOf('notes.PDF', 10, 'application/pdf');

    expect(validateImageFile(file, RULES)).toEqual({
      type: 'image-invalid-type',
      file,
      extension: 'pdf',
      allowedFormats: RULES.formats,
    });
  });

  it('refuses an allowed type with an extension that is not allowed', () => {
    expect(validateImageFile(fileOf('a.gif', 10, 'image/png'), RULES)?.type).toBe(
      'image-invalid-type',
    );
  });

  it('refuses an allowed extension on a type that is not allowed', () => {
    expect(validateImageFile(fileOf('a.png', 10, 'text/plain'), RULES)?.type).toBe(
      'image-invalid-type',
    );
  });

  it('reads the extension in lower case', () => {
    expect(validateImageFile(fileOf('PHOTO.JPG', 10, 'image/jpeg'), RULES)).toBeNull();
  });

  it('does not take the whole name of a file with no dot for its extension', () => {
    const error = validateImageFile(fileOf('png', 10, 'image/png'), RULES);

    expect(error).toMatchObject({ type: 'image-invalid-type', extension: undefined });
  });

  it('reads the last extension of a name with several dots', () => {
    expect(validateImageFile(fileOf('my.photo.final.png'), RULES)).toBeNull();
  });
});

describe('getQuillImageFiles', () => {
  it('gives the files in the order the images were picked', () => {
    const a = fileOf('a.png');
    const b = fileOf('b.png');
    const images: QuillImageRef[] = [
      { id: '1', file: a, blobUrl: 'blob:1' },
      { id: '2', file: b, blobUrl: 'blob:2' },
    ];

    expect(getQuillImageFiles(images)).toEqual([a, b]);
    expect(getQuillImageFiles([])).toEqual([]);
  });
});

describe('hasForbiddenImage', () => {
  const HOSTS = ['res.cloudinary.com'];
  const insertImage = (image: unknown) => new Delta().insert({ image });

  it.each([
    ['a blob: address (an image of this device)', 'blob:http://localhost/1'],
    ['an https address of an allowed host', 'https://res.cloudinary.com/shop/a.png'],
    ['an http address of an allowed host', 'http://res.cloudinary.com/shop/a.png'],
  ])('lets through %s', (_name, src) => {
    expect(hasForbiddenImage(insertImage({ src }), HOSTS)).toBe(false);
    expect(hasForbiddenImage(insertImage(src), HOSTS)).toBe(false);
  });

  it.each([
    ['another host', 'https://evil.test/a.png'],
    ['a host that only starts like the allowed one', 'https://res.cloudinary.com.evil.test/a.png'],
    ['a data: address', 'data:image/png;base64,AAAA'],
    ['a javascript: address', 'javascript:alert(1)'],
    [
      'a javascript: address that names the allowed host',
      'javascript://res.cloudinary.com/%0Aalert(1)',
    ],
    ['an address that is not one', 'not a url'],
    ['an empty address', ''],
  ])('stops %s', (_name, src) => {
    expect(hasForbiddenImage(insertImage({ src }), HOSTS)).toBe(true);
    expect(hasForbiddenImage(insertImage(src), HOSTS)).toBe(true);
  });

  it('stops an image with no address at all', () => {
    expect(hasForbiddenImage(insertImage({ alt: 'x' }), HOSTS)).toBe(true);
    expect(hasForbiddenImage(insertImage(undefined), HOSTS)).toBe(true);
  });

  it('stops the change if even one image of several is not allowed', () => {
    const delta = new Delta()
      .insert({ image: { src: 'blob:http://localhost/1' } })
      .insert({ image: { src: 'https://evil.test/a.png' } });

    expect(hasForbiddenImage(delta, HOSTS)).toBe(true);
  });

  it('is about the hosts it is given', () => {
    const delta = insertImage({ src: 'https://cdn.shop.test/a.png' });

    expect(hasForbiddenImage(delta, HOSTS)).toBe(true);
    expect(hasForbiddenImage(delta, ['cdn.shop.test'])).toBe(false);
    expect(hasForbiddenImage(insertImage({ src: 'https://res.cloudinary.com/a.png' }), [])).toBe(
      true,
    );
  });

  it('does not mind text, formats or other embeds', () => {
    const delta = new Delta()
      .insert('text', { bold: true })
      .insert({ video: 'https://www.youtube.com/embed/x' })
      .retain(2)
      .delete(1);

    expect(hasForbiddenImage(delta, HOSTS)).toBe(false);
    expect(hasForbiddenImage(new Delta(), HOSTS)).toBe(false);
  });
});

describe('getQuillImagesInText', () => {
  let objectUrls: ReturnType<typeof mockObjectUrls>;
  let remove: () => void;

  beforeEach(() => {
    objectUrls = mockObjectUrls();
  });

  afterEach(() => {
    remove();
  });

  const held = (...names: string[]): QuillImageRef[] =>
    names.map((name, index) => ({
      id: name,
      file: fileOf(`${name}.png`),
      blobUrl: `blob:test/${String(index + 1)}`,
    }));

  it('gives the held images that are in the text, in the order they were picked', () => {
    const made = makeQuill(
      '<p><img src="blob:test/3" data-image-id="c"> <img src="blob:test/1" data-image-id="a"></p>',
    );
    remove = made.remove;

    expect(getQuillImagesInText(made.quill, held('a', 'b', 'c')).map(({ id }) => id)).toEqual([
      'a',
      'c',
    ]);
  });

  it('leaves out the images that were deleted from the text', () => {
    const made = makeQuill('<p>no images</p>');
    remove = made.remove;

    expect(getQuillImagesInText(made.quill, held('a', 'b'))).toEqual([]);
  });

  it('leaves out an image of the text that is not held (it came from somewhere else)', () => {
    const made = makeQuill(
      '<p><img src="https://res.cloudinary.com/a.png" data-image-id="saved"></p>',
    );
    remove = made.remove;

    expect(getQuillImagesInText(made.quill, held('a'))).toEqual([]);
  });

  it('does not change the list and does not let go of any blob (a deleted image may come back with an undo)', () => {
    const made = makeQuill('<p><img src="blob:test/1" data-image-id="a"></p>');
    remove = made.remove;

    const images = held('a', 'b');

    getQuillImagesInText(made.quill, images);

    expect(images.map(({ id }) => id)).toEqual(['a', 'b']);
    expect(objectUrls.revoked).toEqual([]);
  });
});

describe('insertImageIntoQuill', () => {
  let objectUrls: ReturnType<typeof mockObjectUrls>;
  let picker: ReturnType<typeof mockFilePicker>;
  let made: ReturnType<typeof makeQuill>;
  let errors: QuillEditorError[];

  beforeEach(() => {
    objectUrls = mockObjectUrls();
    picker = mockFilePicker();
    made = makeQuill('<p>Hello world</p>');
    errors = [];
  });

  afterEach(() => {
    picker.click.mockRestore();
    made.remove();
  });

  const run = (imagesRef: { current: QuillImageRef[] }) => {
    insertImageIntoQuill(made.quill, imagesRef, RULES, (error) => errors.push(error));
  };

  it('opens a file picker that takes the allowed image types', () => {
    run({ current: [] });

    expect(picker.pickers).toHaveLength(1);
    expect(picker.pickers[0]?.type).toBe('file');
    expect(picker.pickers[0]?.accept).toBe('image/png, image/jpeg');
  });

  it('puts the picked image at the cursor, shown from a blob: address, and holds its file', () => {
    const imagesRef = { current: [] as QuillImageRef[] };
    const file = fileOf('photo.png', 20);

    made.quill.setSelection(5, 0);
    run(imagesRef);
    picker.pick(file);

    expect(imagesRef.current).toHaveLength(1);

    const [image] = imagesRef.current;

    expect(image.file).toBe(file);
    expect(image.blobUrl).toBe('blob:test/1');
    expect(image.id).toBeTruthy();

    const img = made.quill.root.querySelector('img');

    expect(img?.getAttribute('src')).toBe('blob:test/1');
    expect(img?.getAttribute('alt')).toBe('photo.png');
    expect(img?.getAttribute('data-image-id')).toBe(image.id);
    // at the cursor: after "Hello"
    expect(made.quill.getContents().ops[0].insert).toBe('Hello');
    expect(errors).toEqual([]);
  });

  it('puts the cursor after the image', () => {
    made.quill.setSelection(5, 0);
    run({ current: [] });
    picker.pick(fileOf('photo.png'));

    expect(made.quill.getSelection()?.index).toBe(6);
  });

  it('puts the image at the end when there is no cursor, instead of doing nothing', () => {
    made.quill.blur();
    run({ current: [] });
    picker.pick(fileOf('photo.png'));

    const ops = made.quill.getContents().ops;

    expect(ops[0].insert).toBe('Hello world');
    expect(JSON.stringify(ops[1].insert)).toContain('blob:test/1');
  });

  it('holds several images in the order they were picked', () => {
    const imagesRef = { current: [] as QuillImageRef[] };

    for (const name of ['a.png', 'b.png', 'c.png']) {
      run(imagesRef);
      picker.pick(fileOf(name));
    }

    expect(imagesRef.current.map(({ file }) => file.name)).toEqual(['a.png', 'b.png', 'c.png']);
    expect(imagesRef.current.map(({ blobUrl }) => blobUrl)).toEqual([
      'blob:test/1',
      'blob:test/2',
      'blob:test/3',
    ]);
    expect(new Set(imagesRef.current.map(({ id }) => id)).size).toBe(3);
  });

  it('reports an image that is too big, and does not insert it', () => {
    const imagesRef = { current: [] as QuillImageRef[] };
    const file = fileOf('big.png', 101);

    run(imagesRef);
    picker.pick(file);

    expect(errors).toEqual([{ type: 'image-too-large', file, size: 101, maxSize: 100 }]);
    expect(imagesRef.current).toEqual([]);
    expect(made.quill.root.querySelector('img')).toBeNull();
    expect(objectUrls.created).toEqual([]);
  });

  it('reports a file of a type that is not allowed, and does not insert it', () => {
    const imagesRef = { current: [] as QuillImageRef[] };

    run(imagesRef);
    picker.pick(fileOf('notes.pdf', 10, 'application/pdf'));

    expect(errors).toHaveLength(1);
    expect(errors[0]?.type).toBe('image-invalid-type');
    expect(imagesRef.current).toEqual([]);
    expect(made.quill.root.querySelector('img')).toBeNull();
  });

  it('does nothing when the picker is closed without a file', () => {
    const imagesRef = { current: [] as QuillImageRef[] };

    run(imagesRef);
    picker.pick(undefined);

    expect(errors).toEqual([]);
    expect(imagesRef.current).toEqual([]);
    expect(made.quill.root.querySelector('img')).toBeNull();
  });

  it('takes one file from one picker: a second change of the same picker does nothing', () => {
    const imagesRef = { current: [] as QuillImageRef[] };

    run(imagesRef);
    picker.pick(fileOf('a.png'));
    picker.pick(fileOf('b.png'), 0);

    expect(imagesRef.current.map(({ file }) => file.name)).toEqual(['a.png']);
    expect(made.quill.root.querySelectorAll('img')).toHaveLength(1);
  });

  it('does not need an error handler', () => {
    insertImageIntoQuill(made.quill, { current: [] }, RULES);
    expect(() => {
      picker.pick(fileOf('big.png', 101));
    }).not.toThrow();
  });
});
