// @vitest-environment jsdom
import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { renderHook, unmountAll } from '../../test-utils/react.js';
import useTryOnUpload, { TRYON_MAX_PHOTO_SIZE } from './useTryOnUpload.js';

const photo = (name = 'face.png', type = 'image/png', bytes = 10) =>
  new File([new Uint8Array(bytes)], name, { type });

let counter = 0;
const created: string[] = [];
const revoked: string[] = [];

beforeEach(() => {
  counter = 0;
  created.length = 0;
  revoked.length = 0;

  // jsdom has no object URLs
  URL.createObjectURL = vi.fn(() => {
    counter += 1;
    created.push(`blob:photo-${String(counter)}`);

    return `blob:photo-${String(counter)}`;
  });
  URL.revokeObjectURL = vi.fn((url: string) => {
    revoked.push(url);
  });
});

afterEach(() => {
  unmountAll();
});

const choose = (view: { result: { current: ReturnType<typeof useTryOnUpload> } }, file: File) => {
  let accepted = false;

  act(() => {
    accepted = view.result.current.setFile(file);
  });

  return accepted;
};

describe('useTryOnUpload', () => {
  describe('a photo that is fine', () => {
    it('is accepted, and shown from an object URL', () => {
      const view = renderHook(() => useTryOnUpload());

      expect(choose(view, photo())).toBe(true);
      expect(view.result.current.file?.name).toBe('face.png');
      expect(view.result.current.previewUrl).toBe('blob:photo-1');
      expect(view.result.current.error).toBeNull();
    });

    it.each([
      ['face.jpg', 'image/jpeg'],
      ['face.JPEG', 'image/jpeg'],
      ['face.webp', 'image/webp'],
    ])('can be a %s', (name, type) => {
      const view = renderHook(() => useTryOnUpload());

      expect(choose(view, photo(name, type))).toBe(true);
    });

    it('can be as big as the limit (5 MB), and not bigger', () => {
      const view = renderHook(() => useTryOnUpload());

      expect(choose(view, photo('a.png', 'image/png', TRYON_MAX_PHOTO_SIZE))).toBe(true);
      expect(choose(view, photo('b.png', 'image/png', TRYON_MAX_PHOTO_SIZE + 1))).toBe(false);
    });
  });

  describe('a photo that is turned down', () => {
    it('because it is too big: it says how big it is and what the limit is', () => {
      const view = renderHook(() => useTryOnUpload());

      expect(choose(view, photo('big.png', 'image/png', 6 * 1024 * 1024))).toBe(false);
      expect(view.result.current.error?.title).toBe('Photo is too large');
      expect(view.result.current.error?.description).toMatch(/6(\.0+)? MB/);
      expect(view.result.current.error?.description).toMatch(/5(\.0+)? MB/);
      expect(view.result.current.file).toBeNull();
      expect(view.result.current.previewUrl).toBeNull();
    });

    it('because it is not an image: it names the ending and says what is accepted', () => {
      const view = renderHook(() => useTryOnUpload());

      expect(choose(view, photo('notes.txt', 'text/plain'))).toBe(false);
      expect(view.result.current.error?.title).toBe('Unsupported photo type');
      expect(view.result.current.error?.description).toContain('.txt');
      expect(view.result.current.error?.description).toContain('jpg');
    });

    it('because its type says image but its ending does not (both have to be right)', () => {
      const view = renderHook(() => useTryOnUpload());

      expect(choose(view, photo('face.exe', 'image/png'))).toBe(false);
      expect(view.result.current.error?.title).toBe('Unsupported photo type');
    });

    it('because its ending says image but its type does not', () => {
      const view = renderHook(() => useTryOnUpload());

      expect(choose(view, photo('face.png', 'application/pdf'))).toBe(false);
    });

    it('because it has no ending', () => {
      const view = renderHook(() => useTryOnUpload());

      expect(choose(view, photo('face', 'image/png'))).toBe(false);
      expect(view.result.current.error?.description).toContain('.face');
    });

    it('keeps the photo that was accepted before', () => {
      const view = renderHook(() => useTryOnUpload());

      choose(view, photo('first.png'));
      choose(view, photo('notes.txt', 'text/plain'));

      expect(view.result.current.file?.name).toBe('first.png');
      expect(view.result.current.previewUrl).toBe('blob:photo-1');
    });

    it('is shown by the hook (`error`) when the app does not want to be told', () => {
      const view = renderHook(() => useTryOnUpload());

      choose(view, photo('notes.txt', 'text/plain'));

      expect(view.result.current.error).not.toBeNull();
    });

    it('is told to the app, and not kept, when the app wants to be told', () => {
      const onReject = vi.fn();
      const view = renderHook(() => useTryOnUpload(onReject));

      choose(view, photo('notes.txt', 'text/plain'));

      expect(onReject).toHaveBeenCalledTimes(1);
      expect(onReject).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Unsupported photo type' }),
      );
      expect(view.result.current.error).toBeNull();
    });

    it('goes away with the next photo that is fine', () => {
      const view = renderHook(() => useTryOnUpload());

      choose(view, photo('notes.txt', 'text/plain'));
      expect(view.result.current.error).not.toBeNull();

      choose(view, photo());
      expect(view.result.current.error).toBeNull();
    });

    it('goes away when it is cleared', () => {
      const view = renderHook(() => useTryOnUpload());

      choose(view, photo('notes.txt', 'text/plain'));
      act(() => {
        view.result.current.clearError();
      });

      expect(view.result.current.error).toBeNull();
    });
  });

  describe('the object URL of the photo', () => {
    it('is let go of when the photo is taken away', () => {
      const view = renderHook(() => useTryOnUpload());

      choose(view, photo());
      act(() => {
        view.result.current.reset();
      });

      expect(revoked).toEqual(['blob:photo-1']);
      expect(view.result.current.file).toBeNull();
      expect(view.result.current.previewUrl).toBeNull();
    });

    it('is let go of when another photo takes its place', () => {
      const view = renderHook(() => useTryOnUpload());

      choose(view, photo('one.png'));
      choose(view, photo('two.png'));

      expect(revoked).toEqual(['blob:photo-1']);
      expect(view.result.current.previewUrl).toBe('blob:photo-2');
    });

    it('is let go of when the hook is removed', () => {
      const view = renderHook(() => useTryOnUpload());

      choose(view, photo());
      view.unmount();

      expect(revoked).toEqual(['blob:photo-1']);
    });

    it('is never made for a photo that was turned down', () => {
      const view = renderHook(() => useTryOnUpload());

      choose(view, photo('notes.txt', 'text/plain'));

      expect(created).toEqual([]);
    });
  });
});
