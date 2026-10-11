// @vitest-environment jsdom
import { describe, expect, expectTypeOf, it } from 'vitest';

import type {
  IActionItem,
  IActionsStore,
  IStoreStorage,
  IThemeStore,
  IToaster,
  IToasterKit,
  IToastStore,
  IUploadItem,
  IUserStore,
  TActionFn,
  TStoreHook,
  TTheme,
  TToastItemOf,
  TUploadItemOf,
} from './index.js';
import * as stores from './index.js';
import {
  createActionsStore,
  createThemeStore,
  createToaster,
  createToastStore,
  createUserStore,
} from './index.js';

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
      'createToastStore',
      'createToaster',
      'createUserStore',
    ]);
  });

  it('exports these types', () => {
    expectTypeOf<TTheme>().toEqualTypeOf<'dark' | 'light'>();
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
    const useThemeStore = createThemeStore();

    expectTypeOf(useThemeStore.getState().theme).toEqualTypeOf<TTheme>();
    expectTypeOf(useThemeStore.getState()).toEqualTypeOf<IThemeStore>();
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

  describe('the toast store has the toasts of the app', () => {
    interface IUploadItem {
      id: string;
      label: string;
    }
    type TToast =
      | { type: 'success'; title: string }
      | { type: 'progress'; title: string; progress: number }
      | { type: 'uploads'; title: string; items: IUploadItem[] };

    it('shows them back with their id', () => {
      const useToastStore = createToastStore<TToast>();

      expectTypeOf(useToastStore.getState()).toEqualTypeOf<IToastStore<TToast>>();
      expectTypeOf(useToastStore.getState().toasts).toEqualTypeOf<TToastItemOf<TToast>[]>();
      expectTypeOf(useToastStore.getState().add).parameter(0).toEqualTypeOf<TToast>();
      expectTypeOf(useToastStore.getState().add).returns.toBeString();
    });

    it('takes the type of an upload from the uploads toast of the app', () => {
      const useToastStore = createToastStore<TToast>();

      expectTypeOf<TUploadItemOf<TToast>>().toEqualTypeOf<IUploadItem>();
      expectTypeOf<TUploadItemOf<{ type: 'success' }>>().toBeNever();
      expectTypeOf(useToastStore.getState().update.uploadItem)
        .parameter(2)
        .toEqualTypeOf<Partial<Omit<IUploadItem, 'id'>>>();
    });

    it('does not take what is not a toast', () => {
      // @ts-expect-error a toast has a type
      const noType = createToastStore<{ title: string }>();
      // @ts-expect-error and its type is a text
      const wrongType = createToastStore<{ type: number }>();
      const useToastStore = createToastStore<TToast>();
      // @ts-expect-error 'error' is not a kind of toast of this app
      useToastStore.getState().add({ type: 'error', title: 'Failed' });
      // @ts-expect-error an upload has no `status` in this app
      useToastStore.getState().update.uploadItem('id', 'item', { status: 'success' });

      expect([noType, wrongType]).toHaveLength(2);
    });
  });

  describe('the toaster takes the toasts of the store it is made for', () => {
    type TToast =
      | { type: 'success' | 'error'; title: string; description?: string }
      | { type: 'custom'; children: string }
      | { type: 'progress'; title: string; progress: number }
      | { type: 'uploads'; title: string; items: IUploadItem[] };

    const useToastStore = createToastStore<TToast>();
    const kit = createToaster(useToastStore); // the types come from the store

    it('has what each kind of toast is made of', () => {
      expectTypeOf(kit).toEqualTypeOf<IToasterKit<TToast>>();
      expectTypeOf(kit.toaster).toEqualTypeOf<IToaster<TToast>>();
      expectTypeOf(kit.toaster.success).parameter(0).toEqualTypeOf<{
        title: string;
        description?: string;
      }>();
      expectTypeOf(kit.toaster.error).parameter(0).toEqualTypeOf<{
        title: string;
        description?: string;
      }>();
      expectTypeOf(kit.toaster.custom).parameter(0).toEqualTypeOf<{
        type: 'custom';
        children: string;
      }>();
      expectTypeOf(kit.toaster.progress.start).parameter(0).toEqualTypeOf<{
        title: string;
        progress: number;
      }>();
      expectTypeOf(kit.toaster.uploads.update)
        .parameter(2)
        .toEqualTypeOf<Partial<Omit<IUploadItem, 'id'>>>();
      expectTypeOf(kit.toaster.success).returns.toBeString();
    });

    it('takes the title of the progress toast for the toast of a request', () => {
      expectTypeOf(kit.withProgressToast<string>)
        .parameter(0)
        .toHaveProperty('title');
      expectTypeOf(kit.withProgressToast<string>).returns.resolves.toBeString();
    });

    it('does not take data that is not of the kind, or a kind the store does not have', () => {
      // only compiled by the type check, never run (the store at the end is not a store)
      const check = () => {
        // @ts-expect-error a success toast has a title
        kit.toaster.success({});
        // @ts-expect-error a progress toast starts with its progress
        kit.toaster.progress.start({ title: 'Uploading' });
        // @ts-expect-error there is no loading toast in this store
        kit.toaster.loading({ title: 'Working' });
        // @ts-expect-error an upload of this store has no `speed`
        kit.toaster.uploads.update('toast', 'item', { speed: 3 });
        // @ts-expect-error a store of no toasts at all is not a store of toasts
        createToaster({});
      };

      expect(check).toBeTypeOf('function');
    });
  });

  it('the actions store has the same actions in every app', () => {
    const useActionsStore = createActionsStore();

    expectTypeOf(useActionsStore.getState()).toEqualTypeOf<IActionsStore>();
  });
});
