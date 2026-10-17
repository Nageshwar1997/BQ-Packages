// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { fileOf, makeQuill, mockObjectUrls } from '../test-utils/quill.js';
import { getQuillContent, processQuillContent, QuillUploadCountError } from './process-content.js';
import type { QuillImageRef } from './types.js';

describe('getQuillContent', () => {
  it('gives back the cleaned HTML', () => {
    expect(getQuillContent('<p>Hello <strong>world</strong></p>')).toBe(
      '<p>Hello <strong>world</strong></p>',
    );
    expect(getQuillContent('<p>a</p><script>x()</script>')).toBe('<p>a</p>');
  });

  it('gives back undefined for a text with nothing in it', () => {
    expect(getQuillContent('')).toBeUndefined();
    expect(getQuillContent('<p><br></p>')).toBeUndefined();
  });

  it('does not take a text that only looks like the empty one for it', () => {
    expect(getQuillContent('<p><br><br></p>')).toBe('<p><br><br></p>');
    expect(getQuillContent('<p> </p>')).toBe('<p> </p>');
  });
});

describe('processQuillContent', () => {
  let objectUrls: ReturnType<typeof mockObjectUrls>;
  let made: ReturnType<typeof makeQuill>;

  beforeEach(() => {
    objectUrls = mockObjectUrls();
  });

  afterEach(() => {
    made.remove();
  });

  /** An editor that shows these images, and the ref that holds them, as the editor leaves them. */
  /** `deleted` are held images that are no longer in the text (the person deleted them). */
  const setup = (names: string[], extraHtml = '', deleted: string[] = []) => {
    const images: QuillImageRef[] = names.map((name, index) => ({
      id: `id-${name}`,
      file: fileOf(name),
      blobUrl: `blob:test/${String(index + 1)}`,
    }));
    const html = `<p>Intro ${images
      .filter(({ id }) => !deleted.includes(id.replace('id-', '')))
      .map(({ id, blobUrl }) => `<img src="${blobUrl}" alt="x" data-image-id="${id}">`)
      .join(' ')} ${extraHtml}</p>`;

    made = makeQuill(html);

    return { quill: made.quill, imagesRef: { current: images }, images };
  };

  it('gives back the content as it is when there are no images, and does not upload', async () => {
    const { quill, imagesRef } = setup([]);
    const upload = vi.fn();

    expect(await processQuillContent({ quill, imagesRef, upload })).toBe('<p>Intro  </p>');
    expect(upload).not.toHaveBeenCalled();
  });

  it('gives back undefined for an editor with nothing in it', async () => {
    made = makeQuill();

    expect(
      await processQuillContent({
        quill: made.quill,
        imagesRef: { current: [] },
        upload: vi.fn(),
      }),
    ).toBeUndefined();
  });

  it('uploads all the files in one call, in the order the images were picked', async () => {
    const { quill, imagesRef, images } = setup(['a.png', 'b.png', 'c.png']);
    const files = images.map(({ file }) => file); // the list is emptied once the upload is done
    const upload = vi.fn(() =>
      Promise.resolve([
        'https://cdn.test/a.png',
        'https://cdn.test/b.png',
        'https://cdn.test/c.png',
      ]),
    );

    await processQuillContent({ quill, imagesRef, upload });

    expect(upload).toHaveBeenCalledTimes(1);
    expect(upload).toHaveBeenCalledWith(files);
  });

  it('puts the address of each upload where the image was, and gives back the content', async () => {
    const { quill, imagesRef } = setup(['a.png', 'b.png', 'c.png']);

    const html = await processQuillContent({
      quill,
      imagesRef,
      upload: () =>
        Promise.resolve([
          'https://cdn.test/a.png',
          'https://cdn.test/b.png',
          'https://cdn.test/c.png',
        ]),
    });

    const sources = Array.from(quill.root.querySelectorAll('img'), (img) =>
      img.getAttribute('src'),
    );

    expect(sources).toEqual([
      'https://cdn.test/a.png',
      'https://cdn.test/b.png',
      'https://cdn.test/c.png',
    ]);
    expect(html).toBe(quill.root.innerHTML);
    expect(html).not.toContain('blob:');
    // each image keeps the rest of what it was
    expect(quill.root.querySelector('img')?.getAttribute('data-image-id')).toBe('id-a.png');
  });

  it('lets go of the blobs and empties the list in place (the ref stays valid)', async () => {
    const { quill, imagesRef, images } = setup(['a.png', 'b.png']);

    await processQuillContent({
      quill,
      imagesRef,
      upload: () => Promise.resolve(['https://cdn.test/a.png', 'https://cdn.test/b.png']),
    });

    expect(objectUrls.revoked).toEqual(['blob:test/1', 'blob:test/2']);
    expect(imagesRef.current).toBe(images);
    expect(images).toEqual([]);
  });

  it('puts the address everywhere the same image is in the text', async () => {
    const { quill, imagesRef } = setup(['a.png'], '<img src="blob:test/1" alt="again">');

    await processQuillContent({
      quill,
      imagesRef,
      upload: () => Promise.resolve(['https://cdn.test/a.png']),
    });

    expect(quill.root.innerHTML).not.toContain('blob:');
    expect(quill.root.querySelectorAll('img[src="https://cdn.test/a.png"]')).toHaveLength(2);
  });

  it('leaves Quill knowing the new text, and says nothing about it', async () => {
    const { quill, imagesRef } = setup(['a.png']);
    const heard = vi.fn();

    quill.on('text-change', heard);

    await processQuillContent({
      quill,
      imagesRef,
      upload: () => Promise.resolve(['https://cdn.test/a.png']),
    });
    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(heard).not.toHaveBeenCalled();
    expect(JSON.stringify(quill.getContents())).toContain('https://cdn.test/a.png');
    expect(JSON.stringify(quill.getContents())).not.toContain('blob:');
  });

  it('changes nothing when the upload fails, so it can be tried again', async () => {
    const { quill, imagesRef, images } = setup(['a.png', 'b.png']);
    const before = quill.root.innerHTML;

    await expect(
      processQuillContent({
        quill,
        imagesRef,
        upload: () => Promise.reject(new Error('network down')),
      }),
    ).rejects.toThrow('network down');

    expect(quill.root.innerHTML).toBe(before);
    expect(imagesRef.current).toBe(images);
    expect(images).toHaveLength(2);
    expect(objectUrls.revoked).toEqual([]);

    // and the second try works
    await processQuillContent({
      quill,
      imagesRef,
      upload: () => Promise.resolve(['https://cdn.test/a.png', 'https://cdn.test/b.png']),
    });

    expect(quill.root.innerHTML).not.toContain('blob:');
  });

  it('refuses an upload that gives fewer addresses than images, and changes nothing', async () => {
    const { quill, imagesRef, images } = setup(['a.png', 'b.png']);
    const before = quill.root.innerHTML;

    const failure = await processQuillContent({
      quill,
      imagesRef,
      upload: () => Promise.resolve(['https://cdn.test/a.png']),
    }).catch((error: unknown) => error);

    expect(failure).toBeInstanceOf(QuillUploadCountError);
    expect(failure).toMatchObject({
      name: 'QuillUploadCountError',
      expected: 2,
      received: 1,
      message: 'Expected 2 uploaded files, got 1.',
    });
    expect(quill.root.innerHTML).toBe(before);
    expect(images).toHaveLength(2);
    expect(objectUrls.revoked).toEqual([]);
  });

  it('does not count an empty address for an upload', async () => {
    const { quill, imagesRef } = setup(['a.png', 'b.png']);

    const failure = await processQuillContent({
      quill,
      imagesRef,
      upload: () => Promise.resolve(['https://cdn.test/a.png', '', null]),
    }).catch((error: unknown) => error);

    expect(failure).toMatchObject({ expected: 2, received: 1 });
  });

  it('refuses an upload that gives more addresses than images', async () => {
    const { quill, imagesRef } = setup(['a.png']);

    const failure = await processQuillContent({
      quill,
      imagesRef,
      upload: () => Promise.resolve(['https://cdn.test/a.png', 'https://cdn.test/b.png']),
    }).catch((error: unknown) => error);

    expect(failure).toMatchObject({ expected: 1, received: 2 });
  });

  it('uploads only the images that are in the text now, and gives each the right address', async () => {
    // b was picked, then deleted from the text: it is held, but not uploaded
    const { quill, imagesRef } = setup(['a.png', 'b.png', 'c.png'], '', ['b.png']);
    const upload = vi.fn((files: File[]) =>
      Promise.resolve(files.map((file) => `https://cdn.test/${file.name}`)),
    );

    await processQuillContent({ quill, imagesRef, upload });

    expect(upload).toHaveBeenCalledTimes(1);
    expect(upload.mock.calls[0]?.[0].map(({ name }) => name)).toEqual(['a.png', 'c.png']);
    expect(
      Array.from(quill.root.querySelectorAll('img'), (img) => img.getAttribute('src')),
    ).toEqual(['https://cdn.test/a.png', 'https://cdn.test/c.png']);
  });

  it('lets go of every held image after an upload, also the ones that were deleted from the text', async () => {
    const { quill, imagesRef, images } = setup(['a.png', 'b.png'], '', ['b.png']);

    await processQuillContent({
      quill,
      imagesRef,
      upload: () => Promise.resolve(['https://cdn.test/a.png']),
    });

    expect(objectUrls.revoked.sort()).toEqual(['blob:test/1', 'blob:test/2']);
    expect(images).toEqual([]);
  });

  it('does not upload when every held image was deleted from the text, and keeps them held', async () => {
    const { quill, imagesRef, images } = setup(['a.png', 'b.png'], '', ['a.png', 'b.png']);
    const upload = vi.fn();

    const html = await processQuillContent({ quill, imagesRef, upload });

    expect(upload).not.toHaveBeenCalled();
    expect(html).toBe(quill.root.innerHTML);
    // an undo can still bring them back, with a blob: that works
    expect(images).toHaveLength(2);
    expect(objectUrls.revoked).toEqual([]);
  });

  it('keeps a deleted image held, and its blob alive, when the upload fails', async () => {
    const { quill, imagesRef, images } = setup(['a.png', 'b.png'], '', ['b.png']);

    await expect(
      processQuillContent({ quill, imagesRef, upload: () => Promise.reject(new Error('down')) }),
    ).rejects.toThrow('down');

    expect(images).toHaveLength(2);
    expect(objectUrls.revoked).toEqual([]);
  });

  it('clears the undo history: an undo cannot bring back the text with the blob: addresses', async () => {
    const { quill, imagesRef } = setup(['a.png']);

    await processQuillContent({
      quill,
      imagesRef,
      upload: () => Promise.resolve(['https://cdn.test/a.png']),
    });
    quill.history.undo();

    expect(quill.root.innerHTML).toContain('https://cdn.test/a.png');
    expect(quill.root.innerHTML).not.toContain('blob:');
    expect(quill.history.stack.undo).toEqual([]);
  });
});
