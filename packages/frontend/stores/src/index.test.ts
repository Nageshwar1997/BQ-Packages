// @vitest-environment jsdom
import { describe, expect, expectTypeOf, it } from 'vitest';

import type {
  IActionItem,
  IActionsStore,
  IStoreStorage,
  IThemeStore,
  IUserStore,
  TActionFn,
  TDefaultTheme,
  TStoreHook,
} from './index.js';
import * as stores from './index.js';
import { createActionsStore, createThemeStore, createUserStore } from './index.js';

interface IUser {
  id: string;
  name: string;
}

describe('the public API of the package', () => {
  // What is reachable is what the apps may rely on: a helper that leaks becomes a promise to keep it.
  it('exports exactly these values', () => {
    expect(Object.keys(stores).sort()).toEqual([
      'createActionsStore',
      'createThemeStore',
      'createUserStore',
    ]);
  });

  it('exports these types', () => {
    expectTypeOf<TDefaultTheme>().toEqualTypeOf<'dark' | 'light'>();
    expectTypeOf<TActionFn>().toEqualTypeOf<() => void | Promise<void>>();
    expectTypeOf<IActionItem['retries']>().toBeNumber();
    expectTypeOf<IActionsStore['actions']>().toEqualTypeOf<IActionItem[]>();
    expectTypeOf<IStoreStorage['getItem']>().toBeFunction();
    expectTypeOf<TStoreHook<{ n: number }>['getState']>().returns.toEqualTypeOf<{ n: number }>();
  });
});

// The apps give the types, so the types have to follow. The `@ts-expect-error` lines are checked by
// the type check of the package (`npm run typecheck`), not by vitest: if one of them compiled, its
// comment would be reported as unused and the check would fail.
describe('the types the app gives', () => {
  it('the user store has the user of the app', () => {
    const useUserStore = createUserStore<IUser>({ storageKey: 'user' });

    expectTypeOf(useUserStore.getState().user).toEqualTypeOf<IUser | null>();
    expectTypeOf(useUserStore.getState().setUser).parameter(0).toEqualTypeOf<IUser | null>();
    expectTypeOf(useUserStore.getState()).toEqualTypeOf<IUserStore<IUser>>();
    expectTypeOf(useUserStore.getState().authenticated).toBeBoolean();
  });

  it('gives `encode`, `decode` and `onSet` the user of the app', () => {
    createUserStore<IUser>({
      storageKey: 'user',
      encode: (user) => {
        expectTypeOf(user).toEqualTypeOf<IUser>();

        return user.id;
      },
      decode: (stored) => {
        expectTypeOf(stored).toBeString();

        return { id: stored, name: '' };
      },
      onSet: (user) => {
        expectTypeOf(user).toEqualTypeOf<IUser>();
      },
    });
  });

  it('does not take a user that is not an object, or a storage key that is missing', () => {
    // @ts-expect-error a user is an object
    const text = createUserStore<string>({ storageKey: 'user' });
    // @ts-expect-error the store has to know where to remember the user
    const nowhere = createUserStore<IUser>({});
    // @ts-expect-error `decode` has to give the user of the app
    const wrong = createUserStore<IUser>({ storageKey: 'user', decode: () => ({ id: 1 }) });

    expect([text, nowhere, wrong]).toHaveLength(3);
  });

  it('the theme store has the themes of the app', () => {
    type TTheme = 'dark' | 'light';

    const useThemeStore = createThemeStore<TTheme>();

    expectTypeOf(useThemeStore.getState().theme).toEqualTypeOf<TTheme>();
    expectTypeOf(useThemeStore.getState()).toEqualTypeOf<IThemeStore<TTheme>>();
  });

  it('takes the type of other themes from the list that is given', () => {
    const fromList = createThemeStore({ themes: ['light', 'dark', 'system'] });
    const named = createThemeStore<'a' | 'b'>({ themes: ['a', 'b'], defaultTheme: 'b' });

    expectTypeOf(fromList.getState().theme).toEqualTypeOf<'light' | 'dark' | 'system'>();
    expectTypeOf(named.getState().theme).toEqualTypeOf<'a' | 'b'>();
  });

  it('wants the list of themes when they are not just dark and light', () => {
    // @ts-expect-error 'system' is a theme, so the store has to be told the list
    const noList = createThemeStore<'dark' | 'light' | 'system'>();
    // @ts-expect-error a default that is not one of the themes
    const badDefault = createThemeStore({ themes: ['dark', 'light'], defaultTheme: 'blue' });
    // @ts-expect-error the list has to be of the themes of the type
    const badList = createThemeStore<'dark' | 'light'>({ themes: ['dark', 'blue'] });

    expect([noList, badDefault, badList]).toHaveLength(3);
  });

  it('the actions store has the same actions in every app', () => {
    const useActionsStore = createActionsStore();

    expectTypeOf(useActionsStore.getState()).toEqualTypeOf<IActionsStore>();
  });
});
