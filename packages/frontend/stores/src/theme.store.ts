import { create } from 'zustand';

import { getDefaultStorage, type IStoreStorage, readStored, writeStored } from './storage.js';
import type { TStoreHook } from './types.js';

/** The two themes the apps have. */
export type TDefaultTheme = 'dark' | 'light';

export interface IThemeStore<TTheme extends string = TDefaultTheme> {
  theme: TTheme;
  /** Goes to the next theme of `themes` (back to the first after the last) and remembers it. */
  toggleTheme: () => void;
}

export interface IThemeStoreOptions<TTheme extends string = TDefaultTheme> {
  /**
   * Every theme there is, in the order `toggleTheme` goes through them. Needed when there are other
   * themes than `'dark'` and `'light'`.
   * @default ['dark', 'light']
   */
  themes?: readonly [TTheme, ...TTheme[]];
  /**
   * The theme when none that is valid is remembered.
   * @default the first of `themes`
   */
  // `NoInfer`: the type of the themes comes from `themes` alone, so a default that is not in the
  // list is an error, not one more theme
  defaultTheme?: NoInfer<TTheme>;
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

export type TThemeStoreHook<TTheme extends string = TDefaultTheme> = TStoreHook<
  IThemeStore<TTheme>
>;

const DEFAULT_THEMES: readonly [TDefaultTheme, TDefaultTheme] = ['dark', 'light'];

/**
 * The theme store, with the theme the person chose last time (or `defaultTheme`). Call it once, in
 * a module of the app, and export what it gives back: every call makes a store of its own.
 *
 * ```ts
 * export const useThemeStore = createThemeStore<TTheme>(); // TTheme = 'dark' | 'light'
 * export const useThemeStore = createThemeStore({ themes: ['dark', 'light', 'system'] });
 * ```
 */
export function createThemeStore<TTheme extends string>(
  options: IThemeStoreOptions<TTheme> & { themes: readonly [TTheme, ...TTheme[]] },
): TThemeStoreHook<TTheme>;
// `_TTheme` is only there to let the app write `createThemeStore<TTheme>()` with its own name for
// 'dark' | 'light'; it must be that (or less), anything else needs `themes` (the overload above).
// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-parameters
export function createThemeStore<_TTheme extends TDefaultTheme = TDefaultTheme>(
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
