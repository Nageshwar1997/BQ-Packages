import { describe, expect, it } from 'vitest';

import { MEDIA_LABELS, resolveLabels, type TMediaOption } from './labels.js';

const IMAGE: TMediaOption = { type: 'image', url: 'a.webp' };
const VIDEO: TMediaOption = { type: 'video', url: 'a.mp4' };

describe('MEDIA_LABELS', () => {
  it('names the buttons and the pictures in English', () => {
    expect(MEDIA_LABELS.gallery).toBe('Media gallery');
    expect(MEDIA_LABELS.thumbnails).toBe('Thumbnails');
    expect(MEDIA_LABELS.previous).toBe('Previous');
    expect(MEDIA_LABELS.next).toBe('Next');
    expect(MEDIA_LABELS.close).toBe('Close');
  });

  it('counts from 1', () => {
    expect(MEDIA_LABELS.counter(0, 5)).toBe('1 of 5');
    expect(MEDIA_LABELS.counter(4, 5)).toBe('5 of 5');
  });

  it('says what a thumbnail shows, by what it is', () => {
    expect(MEDIA_LABELS.select(IMAGE, 1, 4)).toBe('Show image 2 of 4');
    expect(MEDIA_LABELS.select(VIDEO, 0, 4)).toBe('Show video 1 of 4');
  });

  it('describes the picture that is shown, by what it is', () => {
    expect(MEDIA_LABELS.preview(IMAGE, 1, 4)).toBe('Image 2 of 4');
    expect(MEDIA_LABELS.preview(VIDEO, 2, 4)).toBe('Video 3 of 4');
  });

  it('says what the remove button of an item does', () => {
    expect(MEDIA_LABELS.remove(IMAGE, 0)).toBe('Remove image 1');
    expect(MEDIA_LABELS.remove(VIDEO, 2)).toBe('Remove video 3');
  });
});

describe('resolveLabels', () => {
  it('is the default words when the app gives none', () => {
    expect(resolveLabels()).toEqual(MEDIA_LABELS);
    expect(resolveLabels({})).toEqual(MEDIA_LABELS);
  });

  it('uses the words the app gives, and the default for each one it leaves out', () => {
    const labels = resolveLabels({
      gallery: 'Galería',
      next: 'Siguiente',
      counter: (index, total) => `${String(index + 1)} de ${String(total)}`,
    });

    expect(labels.gallery).toBe('Galería');
    expect(labels.next).toBe('Siguiente');
    expect(labels.counter(1, 3)).toBe('2 de 3');
    expect(labels.previous).toBe('Previous');
    expect(labels.thumbnails).toBe('Thumbnails');
    expect(labels.close).toBe('Close');
    expect(labels.select).toBe(MEDIA_LABELS.select);
    expect(labels.preview).toBe(MEDIA_LABELS.preview);
    expect(labels.remove).toBe(MEDIA_LABELS.remove);
  });

  it('takes each word from its own place', () => {
    const labels = resolveLabels({
      gallery: 'g',
      thumbnails: 't',
      previous: 'p',
      next: 'n',
      close: 'c',
      select: () => 's',
      preview: () => 'v',
      remove: () => 'r',
      counter: () => 'k',
    });

    expect([
      labels.gallery,
      labels.thumbnails,
      labels.previous,
      labels.next,
      labels.close,
      labels.select(IMAGE, 0, 1),
      labels.preview(IMAGE, 0, 1),
      labels.remove(IMAGE, 0),
      labels.counter(0, 1),
    ]).toEqual(['g', 't', 'p', 'n', 'c', 's', 'v', 'r', 'k']);
  });

  it('uses the default for a word that is given as undefined', () => {
    expect(resolveLabels({ next: undefined }).next).toBe('Next');
  });
});
