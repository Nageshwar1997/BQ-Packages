// @vitest-environment jsdom
import Quill from 'quill';
import { afterEach, describe, expect, it } from 'vitest';

import { makeQuill } from '../test-utils/quill.js';
import { QuillImgBlot, registerQuillFormats } from './image-blot.js';

describe('registerQuillFormats', () => {
  it('makes the image of the package the image of Quill', () => {
    registerQuillFormats();

    expect(Quill.import('formats/image')).toBe(QuillImgBlot);
  });

  it('can be asked again and again', () => {
    registerQuillFormats();
    registerQuillFormats();

    expect(Quill.import('formats/image')).toBe(QuillImgBlot);
  });
});

describe('QuillImgBlot', () => {
  let remove: () => void;

  afterEach(() => {
    remove();
  });

  const setup = () => {
    const made = makeQuill();

    remove = made.remove;

    return made.quill;
  };

  it('writes an image with its address, its text and its id', () => {
    const quill = setup();

    quill.insertEmbed(0, 'image', { src: 'blob:test/1', alt: 'Photo', id: 'abc' }, 'user');

    const img = quill.root.querySelector('img');

    expect(img?.getAttribute('src')).toBe('blob:test/1');
    expect(img?.getAttribute('alt')).toBe('Photo');
    expect(img?.getAttribute('data-image-id')).toBe('abc');
  });

  it('says "Image" when there is no text, and writes no id when there is none', () => {
    const quill = setup();

    quill.insertEmbed(0, 'image', { src: 'https://res.cloudinary.com/a.png' }, 'user');

    const img = quill.root.querySelector('img');

    expect(img?.getAttribute('alt')).toBe('Image');
    expect(img?.hasAttribute('data-image-id')).toBe(false);
  });

  it('takes a plain address too', () => {
    const quill = setup();

    quill.insertEmbed(0, 'image', 'https://res.cloudinary.com/a.png', 'user');

    expect(quill.root.querySelector('img')?.getAttribute('src')).toBe(
      'https://res.cloudinary.com/a.png',
    );
  });

  it('reads an image of the page back with its address, its text and its id', () => {
    const quill = setup();

    quill.root.innerHTML =
      '<p><img src="https://res.cloudinary.com/a.png" alt="A" data-image-id="i1"></p>';
    quill.update('silent');

    expect(quill.getContents().ops[0].insert).toEqual({
      image: { src: 'https://res.cloudinary.com/a.png', alt: 'A', id: 'i1' },
    });
  });

  it('lets a blob: address through', () => {
    expect(QuillImgBlot.sanitize('blob:http://localhost:3000/1234')).toBe(
      'blob:http://localhost:3000/1234',
    );
  });

  it('lets an http(s) address through', () => {
    expect(QuillImgBlot.sanitize('https://res.cloudinary.com/a.png')).toBe(
      'https://res.cloudinary.com/a.png',
    );
    expect(QuillImgBlot.sanitize('http://res.cloudinary.com/a.png')).toBe(
      'http://res.cloudinary.com/a.png',
    );
  });

  it.each(['javascript:alert(1)', 'data:image/png;base64,AAAA', 'vbscript:x'])(
    'does not let %s through (Quill turns it into a harmless address)',
    (url) => {
      expect(QuillImgBlot.sanitize(url)).toBe('about:blank');
    },
  );
});
