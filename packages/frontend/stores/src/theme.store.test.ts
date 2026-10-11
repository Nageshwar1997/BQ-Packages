// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { IStoreStorage } from './storage.js';
import { createThemeStore } from './theme.store.js';

beforeEach(() => {
  localStorage.clear();
});

describe('createThemeStore', () => {
  it('starts dark when nothing is remembered', () => {
    expect(createThemeStore().getState().theme).toBe('dark');
  });

  it('starts with the theme that was remembered', () => {
    localStorage.setItem('theme', 'light');

    expect(createThemeStore().getState().theme).toBe('light');
  });

  it('does not take a remembered theme that is not one of the themes', () => {
    localStorage.setItem('theme', 'blue');

    expect(createThemeStore().getState().theme).toBe('dark');
  });

  it('goes dark, light, dark, and remembers each', () => {
    const store = createThemeStore();

    store.getState().toggleTheme();
    expect(store.getState().theme).toBe('light');
    expect(localStorage.getItem('theme')).toBe('light');

    store.getState().toggleTheme();
    expect(store.getState().theme).toBe('dark');
    expect(localStorage.getItem('theme')).toBe('dark');
  });

  it('remembers under the key it was given, and only there', () => {
    const store = createThemeStore({ storageKey: 'bq:theme' });

    store.getState().toggleTheme();

    expect(localStorage.getItem('bq:theme')).toBe('light');
    expect(localStorage.getItem('theme')).toBeNull();
  });

  it('starts with `defaultTheme` when nothing is remembered', () => {
    expect(
      createThemeStore({ themes: ['dark', 'light'], defaultTheme: 'light' }).getState().theme,
    ).toBe('light');
  });

  it('prefers what was remembered to `defaultTheme`', () => {
    localStorage.setItem('theme', 'dark');

    expect(
      createThemeStore({ themes: ['dark', 'light'], defaultTheme: 'light' }).getState().theme,
    ).toBe('dark');
  });

  describe('with other themes', () => {
    const themes = ['light', 'dark', 'system'] as const;

    it('starts with the first one, and goes through them in order and back to the first', () => {
      const store = createThemeStore({ themes });

      expect(store.getState().theme).toBe('light');

      const seen = [];

      for (let step = 0; step < 4; step += 1) {
        store.getState().toggleTheme();
        seen.push(store.getState().theme);
      }

      expect(seen).toEqual(['dark', 'system', 'light', 'dark']);
    });

    it('takes a remembered theme from the list', () => {
      localStorage.setItem('theme', 'system');

      expect(createThemeStore({ themes }).getState().theme).toBe('system');
    });

    it('goes to the first when the current theme is not in the list any more', () => {
      const store = createThemeStore({ themes });

      store.setState({ theme: 'sepia' as never });
      store.getState().toggleTheme();

      expect(store.getState().theme).toBe('light');
    });
  });

  it('tells its subscribers', () => {
    const store = createThemeStore();
    const listener = vi.fn();

    store.subscribe(listener);
    store.getState().toggleTheme();

    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('makes a store of its own each time it is called', () => {
    const first = createThemeStore();
    const second = createThemeStore();

    first.getState().toggleTheme();

    expect(first.getState().theme).toBe('light');
    expect(second.getState().theme).toBe('dark');
  });

  describe('with another storage', () => {
    it('remembers in the one it was given, not in localStorage', () => {
      sessionStorage.clear();
      const store = createThemeStore({ storage: sessionStorage });

      store.getState().toggleTheme();

      expect(sessionStorage.getItem('theme')).toBe('light');
      expect(localStorage.getItem('theme')).toBeNull();
    });

    it('keeps working when the storage cannot be read or written', () => {
      const blocked: IStoreStorage = {
        getItem: () => {
          throw new Error('blocked');
        },
        setItem: () => {
          throw new Error('blocked');
        },
        removeItem: () => {
          throw new Error('blocked');
        },
      };
      const store = createThemeStore({ storage: blocked });

      expect(store.getState().theme).toBe('dark');

      store.getState().toggleTheme();

      expect(store.getState().theme).toBe('light');
    });
  });
});
