// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { IStoreStorage } from './storage.js';
import { createUserStore, type TUserStoreHook } from './user.store.js';

interface IUser {
  id: string;
  name: string;
}

const asha: IUser = { id: '1', name: 'Asha' };

beforeEach(() => {
  localStorage.clear();
});

describe('createUserStore', () => {
  describe('at the start', () => {
    it('has no user when none was remembered', () => {
      const state = createUserStore<IUser>({ storageKey: 'user' }).getState();

      expect(state.user).toBeNull();
      expect(state.authenticated).toBe(false);
    });

    it('has the user that was remembered', () => {
      localStorage.setItem('user', JSON.stringify(asha));

      const state = createUserStore<IUser>({ storageKey: 'user' }).getState();

      expect(state.user).toEqual(asha);
      expect(state.authenticated).toBe(true);
    });

    it('has no user when what was remembered is not an object', () => {
      for (const stored of ['12', '"text"', 'null', 'not json at all', '']) {
        localStorage.setItem('user', stored);

        const state = createUserStore<IUser>({ storageKey: 'user' }).getState();

        expect(state.user, stored).toBeNull();
        expect(state.authenticated, stored).toBe(false);
      }
    });

    it('reads it with `decode` when one is given', () => {
      localStorage.setItem('user', 'asha|1');

      const state = createUserStore<IUser>({
        storageKey: 'user',
        decode: (stored) => {
          const [name, id] = stored.split('|');

          return { id, name };
        },
      }).getState();

      expect(state.user).toEqual({ id: '1', name: 'asha' });
    });

    it('has no user when `decode` says it is not one', () => {
      localStorage.setItem('user', 'x');

      expect(
        createUserStore<IUser>({ storageKey: 'user', decode: () => null }).getState().user,
      ).toBeNull();
    });

    it('has no user, and still starts, when `decode` throws', () => {
      localStorage.setItem('user', 'x');

      const state = createUserStore<IUser>({
        storageKey: 'user',
        decode: () => {
          throw new Error('cannot decrypt');
        },
      }).getState();

      expect(state.user).toBeNull();
      expect(state.authenticated).toBe(false);
    });

    it('does not call `decode` when nothing is remembered', () => {
      const decode = vi.fn();

      createUserStore<IUser>({ storageKey: 'user', decode });

      expect(decode).not.toHaveBeenCalled();
    });
  });

  describe('setUser', () => {
    it('sets the user, and remembers it', () => {
      const store = createUserStore<IUser>({ storageKey: 'user' });

      store.getState().setUser(asha);

      expect(store.getState().user).toEqual(asha);
      expect(store.getState().authenticated).toBe(true);
      expect(JSON.parse(localStorage.getItem('user') ?? 'null')).toEqual(asha);
    });

    it('is the user that is there at the next start', () => {
      createUserStore<IUser>({ storageKey: 'user' }).getState().setUser(asha);

      expect(createUserStore<IUser>({ storageKey: 'user' }).getState().user).toEqual(asha);
    });

    it('remembers what `encode` makes of the user', () => {
      const store = createUserStore<IUser>({
        storageKey: 'user',
        encode: (user) => `${user.name}|${user.id}`,
      });

      store.getState().setUser(asha);

      expect(localStorage.getItem('user')).toBe('Asha|1');
    });

    it('forgets the user with null', () => {
      const store = createUserStore<IUser>({ storageKey: 'user' });

      store.getState().setUser(asha);
      store.getState().setUser(null);

      expect(store.getState().user).toBeNull();
      expect(store.getState().authenticated).toBe(false);
      expect(localStorage.getItem('user')).toBeNull();
    });

    it('remembers under its own key and leaves the others alone', () => {
      localStorage.setItem('theme', 'light');
      const store = createUserStore<IUser>({ storageKey: 'bq:user' });

      store.getState().setUser(asha);
      store.getState().setUser(null);

      expect(localStorage.getItem('theme')).toBe('light');
    });

    it('tells its subscribers', () => {
      const store = createUserStore<IUser>({ storageKey: 'user' });
      const listener = vi.fn();

      store.subscribe(listener);
      store.getState().setUser(asha);

      expect(listener).toHaveBeenCalledTimes(1);
    });
  });

  describe('onSet', () => {
    it('is called with the user each time one is set', () => {
      const onSet = vi.fn();
      const store = createUserStore<IUser>({ storageKey: 'user', onSet });

      store.getState().setUser(asha);
      store.getState().setUser({ id: '2', name: 'Ravi' });

      expect(onSet.mock.calls).toEqual([[asha], [{ id: '2', name: 'Ravi' }]]);
    });

    it('is not called when the user is forgotten', () => {
      const onSet = vi.fn();
      const store = createUserStore<IUser>({ storageKey: 'user', onSet });

      store.getState().setUser(null);

      expect(onSet).not.toHaveBeenCalled();
    });

    it('is not called at the start, for the user that was remembered', () => {
      localStorage.setItem('user', JSON.stringify(asha));
      const onSet = vi.fn();

      createUserStore<IUser>({ storageKey: 'user', onSet });

      expect(onSet).not.toHaveBeenCalled();
    });

    it('is called after the user was remembered and before the store has it', () => {
      let seen: { stored: string | null; inStore: IUser | null } | undefined;

      const store: TUserStoreHook<IUser> = createUserStore<IUser>({
        storageKey: 'user',
        onSet: () => {
          seen = { stored: localStorage.getItem('user'), inStore: store.getState().user };
        },
      });

      store.getState().setUser(asha);

      expect(seen).toEqual({ stored: JSON.stringify(asha), inStore: null });
      expect(store.getState().user).toEqual(asha);
    });
  });

  describe('with another storage', () => {
    it('remembers in the one it was given, not in localStorage', () => {
      sessionStorage.clear();
      const store = createUserStore<IUser>({ storageKey: 'user', storage: sessionStorage });

      store.getState().setUser(asha);

      expect(sessionStorage.getItem('user')).not.toBeNull();
      expect(localStorage.getItem('user')).toBeNull();
    });

    it('keeps working when the storage cannot be read or written', () => {
      const onSet = vi.fn();
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
      const store = createUserStore<IUser>({ storageKey: 'user', storage: blocked, onSet });

      expect(store.getState().user).toBeNull();

      store.getState().setUser(asha);
      expect(store.getState().user).toEqual(asha);
      expect(onSet).toHaveBeenCalledWith(asha);

      store.getState().setUser(null);
      expect(store.getState().user).toBeNull();
    });
  });

  it('makes a store of its own each time it is called', () => {
    const first = createUserStore<IUser>({ storageKey: 'user' });
    const second = createUserStore<IUser>({ storageKey: 'other' });

    first.getState().setUser(asha);

    expect(second.getState().user).toBeNull();
  });
});
