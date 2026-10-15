// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { renderHook, unmountAll } from '../test-utils/react.js';
import { getMediaType } from './media-type.js';
import { useObjectUrls } from './useObjectUrls.js';

const file = (name: string, type = 'image/png') => new File(['x'], name, { type });

describe('getMediaType', () => {
  it.each([
    ['image/png', 'image'],
    ['image/webp', 'image'],
    ['video/mp4', 'video'],
    ['video/webm', 'video'],
    ['video/quicktime', 'video'],
    ['application/pdf', 'image'],
    ['application/x-video-thing', 'image'],
    ['', 'image'],
  ])('says a file of type "%s" is a %s', (type, expected) => {
    expect(getMediaType(file('f', type))).toBe(expected);
  });

  it.each([
    ['https://cdn.example/a/b/photo.jpg', 'image'],
    ['https://cdn.example/a/b/photo.WEBP', 'image'],
    ['/images/logo.svg', 'image'],
    ['https://cdn.example/clip.mp4', 'video'],
    ['https://cdn.example/clip.MP4', 'video'],
    ['https://cdn.example/clip.webm', 'video'],
    ['https://cdn.example/clip.mov', 'video'],
    ['https://cdn.example/clip.mkv', 'video'],
    ['https://cdn.example/clip.m4v', 'video'],
    ['https://cdn.example/clip.avi', 'video'],
    ['https://cdn.example/clip.ogv', 'video'],
    ['https://cdn.example/clip.ogg', 'video'],
    ['https://cdn.example/stream/master.m3u8', 'video'],
  ])('says the address %s is a %s', (url, expected) => {
    expect(getMediaType(url)).toBe(expected);
  });

  it('looks at the ending before a query string or a hash', () => {
    expect(getMediaType('https://cdn.example/clip.mp4?token=a.b.c')).toBe('video');
    expect(getMediaType('https://cdn.example/clip.mp4#t=10')).toBe('video');
    expect(getMediaType('https://cdn.example/photo.jpg?name=clip.mp4')).toBe('image');
    expect(getMediaType('https://cdn.example/photo.jpg#clip.mp4')).toBe('image');
  });

  it('takes what it does not know for a picture', () => {
    expect(getMediaType('https://cdn.example/no-extension')).toBe('image');
    expect(getMediaType('https://cdn.example/file.unknown')).toBe('image');
    expect(getMediaType('blob:https://example.com/3f2a')).toBe('image');
    expect(getMediaType('data:image/png;base64,AAAA')).toBe('image');
    expect(getMediaType('')).toBe('image');
  });

  it('needs the dot: a name that only is, or contains, the ending is not a video', () => {
    expect(getMediaType('mp4')).toBe('image');
    expect(getMediaType('https://example.com/mp4')).toBe('image');
    expect(getMediaType('https://example.com/mp4/photo.png')).toBe('image');
    expect(getMediaType('https://example.com/clip.mp4/')).toBe('image');
  });
});

describe('useObjectUrls', () => {
  let counter: number;
  let create: ReturnType<typeof vi.fn>;
  let revoke: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    counter = 0;
    create = vi.fn(() => {
      counter += 1;

      return `blob:mock/${String(counter)}`;
    });
    revoke = vi.fn();
    vi.stubGlobal('URL', Object.assign(URL, { createObjectURL: create, revokeObjectURL: revoke }));
  });

  afterEach(() => {
    unmountAll();
    vi.unstubAllGlobals();
  });

  describe('with a list that stays the same', () => {
    const a = file('a.png');
    const b = file('b.png');
    const list = [a, b];

    it('makes one address for each file, after the render', () => {
      const hook = renderHook(() => useObjectUrls(list));

      expect(create).toHaveBeenCalledTimes(2);
      expect(hook.result.current.get(a)).toBe('blob:mock/1');
      expect(hook.result.current.get(b)).toBe('blob:mock/2');
    });

    it('does not make them again when it renders again', () => {
      const hook = renderHook(() => useObjectUrls(list));

      hook.rerender();
      hook.rerender();

      expect(create).toHaveBeenCalledTimes(2);
      expect(revoke).not.toHaveBeenCalled();
    });

    it('gives them all back when it is removed', () => {
      const hook = renderHook(() => useObjectUrls(list));

      hook.unmount();

      expect(revoke).toHaveBeenCalledTimes(2);
      expect(revoke).toHaveBeenCalledWith('blob:mock/1');
      expect(revoke).toHaveBeenCalledWith('blob:mock/2');
    });
  });

  describe('when the list changes', () => {
    const a = file('a.png');
    const b = file('b.png');
    const c = file('c.png');

    const change = () => {
      let current: readonly File[] = [a, b];
      const hook = renderHook(() => useObjectUrls(current));

      return {
        hook,
        set: (next: readonly File[]) => {
          current = next;
          hook.rerender();
        },
      };
    };

    it('makes an address for a file that is added, and keeps the others', () => {
      const { hook, set } = change();

      set([a, b, c]);

      expect(create).toHaveBeenCalledTimes(3);
      expect(hook.result.current.get(a)).toBe('blob:mock/1');
      expect(hook.result.current.get(c)).toBe('blob:mock/3');
      expect(revoke).not.toHaveBeenCalled();
    });

    it('gives back the address of a file that is taken away, and only that one', () => {
      const { hook, set } = change();

      set([b]);

      expect(revoke).toHaveBeenCalledTimes(1);
      expect(revoke).toHaveBeenCalledWith('blob:mock/1');
      expect(hook.result.current.has(a)).toBe(false);
      expect(hook.result.current.get(b)).toBe('blob:mock/2');
    });

    it('handles an added and a removed file at once', () => {
      const { hook, set } = change();

      set([b, c]);

      expect(revoke).toHaveBeenCalledWith('blob:mock/1');
      expect(hook.result.current.get(c)).toBe('blob:mock/3');
      expect(hook.result.current.size).toBe(2);
    });

    it('gives back everything for an empty list', () => {
      const { hook, set } = change();

      set([]);

      expect(revoke).toHaveBeenCalledTimes(2);
      expect(hook.result.current.size).toBe(0);
    });

    it('makes a new address for a file that comes back', () => {
      const { hook, set } = change();

      set([b]);
      set([a, b]);

      expect(hook.result.current.get(a)).toBe('blob:mock/3');
    });

    it('does not make two addresses for a file that is twice in the list', () => {
      const { set } = change();

      set([a, a, b]);

      expect(create).toHaveBeenCalledTimes(2);
    });
  });

  it('is empty without files, and makes nothing', () => {
    const none: readonly File[] = [];
    const hook = renderHook(() => useObjectUrls(none));

    expect(hook.result.current.size).toBe(0);
    expect(create).not.toHaveBeenCalled();
  });

  it('keeps one address for a file in StrictMode, which runs the effects twice', () => {
    const a = file('a.png');
    const list = [a];
    const hook = renderHook(() => useObjectUrls(list), { strict: true });

    const url = hook.result.current.get(a);

    expect(url).toBeDefined();
    // every address that was made and is not the one in use was given back
    const inUse = create.mock.results.filter((result) => result.value === url).length;

    expect(inUse).toBe(1);
    expect(revoke).not.toHaveBeenCalledWith(url);
    expect(create.mock.calls.length - revoke.mock.calls.length).toBe(1);

    hook.unmount();

    expect(revoke).toHaveBeenCalledTimes(create.mock.calls.length);
  });
});
