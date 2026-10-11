import { create } from 'zustand';

import { getDefaultStorage, type IStoreStorage, readStored, writeStored } from './storage.js';
import type { TStoreHook } from './types.js';

/** The two themes the apps have. */
export type TTheme = 'dark' | 'light';

export interface IThemeStore<TThemeName extends string = TTheme> {
  theme: TThemeName;
  /** Goes to the next theme of `themes` (back to the first after the last) and remembers it. */
  toggleTheme: () => void;
}

export interface IThemeStoreOptions<TThemeName extends string = TTheme> {
  /**
   * Every theme there is, in the order `toggleTheme` goes through them. Needed when there are other
   * themes than `'dark'` and `'light'`.
   * @default ['dark', 'light']
   */
  themes?: readonly [TThemeName, ...TThemeName[]];
  /**
   * The theme when none that is valid is remembered.
   * @default the first of `themes`
   */
  // `NoInfer`: the type of the themes comes from `themes` alone, so a default that is not in the
  // list is an error, not one more theme
  defaultTheme?: NoInfer<TThemeName>;
  /**
   * Where the theme is remembered.
   * @default 'theme'
   */
  storageKey?: string;
  /**
   * What remembers it.
   * @default localStorage
   */
  storage?: IStoreStorage;
}

export type TThemeStoreHook<TThemeName extends string = TTheme> = TStoreHook<
  IThemeStore<TThemeName>
>;

const DEFAULT_THEMES: readonly [TTheme, TTheme] = ['dark', 'light'];

/**
 * The theme store, with the theme the person chose last time (or `defaultTheme`). Call it once, in
 * a module of the app, and export what it gives back: every call makes a store of its own.
 *
 * ```ts
 * export const useThemeStore = createThemeStore(); // themes: TTheme, 'dark' | 'light'
 * export const useThemeStore = createThemeStore({ themes: ['dark', 'light', 'system'] });
 * ```
 */
export function createThemeStore<TThemeName extends string>(
  options: IThemeStoreOptions<TThemeName> & { themes: readonly [TThemeName, ...TThemeName[]] },
): TThemeStoreHook<TThemeName>;
// `_TThemeName` is only there to let the app write `createThemeStore<TTheme>()` (or its own name for
// 'dark' | 'light'); it must be that (or less), anything else needs `themes` (the overload above).
// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-parameters
export function createThemeStore<_TThemeName extends TTheme = TTheme>(
  options?: IThemeStoreOptions & { themes?: undefined },
): TThemeStoreHook;
export function createThemeStore(
  options: IThemeStoreOptions<string> = {},
): TThemeStoreHook<string> {
  const {
    themes = DEFAULT_THEMES,
    defaultTheme = themes[0],
    storageKey = 'theme',
    storage = getDefaultStorage(),
  } = options;

  const stored = readStored(storage, storageKey);

  return create<IThemeStore<string>>((set, get) => ({
    theme: stored !== null && themes.includes(stored) ? stored : defaultTheme,

    toggleTheme: () => {
      const next = themes[(themes.indexOf(get().theme) + 1) % themes.length];

      writeStored(storage, storageKey, next);
      set({ theme: next });
    },
  }));
}
