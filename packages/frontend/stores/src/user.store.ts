import { create } from 'zustand';

import {
  getDefaultStorage,
  type IStoreStorage,
  readStored,
  removeStored,
  writeStored,
} from './storage.js';
import type { TStoreHook } from './types.js';

export interface IUserStore<TUser extends object> {
  /** The signed-in user, or `null`. It is the one that was remembered, until `setUser` says another. */
  user: TUser | null;
  /** `true` when there is a user. */
  authenticated: boolean;
  /** Sets (and remembers) the user, or forgets it with `null`. */
  setUser: (user: TUser | null) => void;
}

export interface IUserStoreOptions<TUser extends object> {
  /** Where the user is remembered, e.g. `'user'`. */
  storageKey: string;
  /**
   * Turns the user into the text that is remembered, e.g. to encrypt it.
   * @default JSON.stringify
   */
  encode?: (user: TUser) => string;
  /**
   * Turns what was remembered back into the user: `null` when it is not one. A `decode` that throws
   * counts as `null` too, so a bad value never stops the app from starting.
   * @default JSON.parse, that only gives an object
   */
  decode?: (stored: string) => TUser | null;
  /**
   * Called each time a user is set (not when it is forgotten), after it was remembered and before
   * the store changes. E.g. to start a new session in the app.
   */
  onSet?: (user: TUser) => void;
  /**
   * What remembers the user.
   * @default localStorage
   */
  storage?: IStoreStorage;
}

export type TUserStoreHook<TUser extends object> = TStoreHook<IUserStore<TUser>>;

const parseUser = (stored: string): object | null => {
  const value: unknown = JSON.parse(stored);

  return typeof value === 'object' && value !== null ? value : null;
};

/**
 * The user store, with the user that was remembered last time. The app gives the type of its user,
 * and how the user is remembered. Call it once, in a module of the app, and export what it gives
 * back: every call makes a store of its own.
 *
 * ```ts
 * export const useUserStore = createUserStore<IUser>({
 *   storageKey: USER_KEY,
 *   encode: encryptData,
 *   decode: (stored) => decryptData<IUser>(stored),
 *   onSet: resetAuthLogoutState,
 * });
 * ```
 */
export const createUserStore = <TUser extends object>({
  storageKey,
  encode = (user) => JSON.stringify(user),
  decode = parseUser as (stored: string) => TUser | null,
  onSet,
  storage = getDefaultStorage(),
}: IUserStoreOptions<TUser>): TUserStoreHook<TUser> => {
  const readUser = (): TUser | null => {
    const stored = readStored(storage, storageKey);

    if (stored === null) return null;

    try {
      return decode(stored);
    } catch {
      return null;
    }
  };

  const user = readUser();

  return create<IUserStore<TUser>>((set) => ({
    user,
    authenticated: user !== null,

    setUser: (nextUser) => {
      if (nextUser) {
        writeStored(storage, storageKey, encode(nextUser));
        onSet?.(nextUser);
      } else {
        removeStored(storage, storageKey);
      }

      set({ user: nextUser, authenticated: nextUser !== null });
    },
  }));
};
