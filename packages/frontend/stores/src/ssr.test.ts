// @vitest-environment node
import { describe, expect, it } from 'vitest';

import { createActionsStore } from './actions.store.js';
import { createThemeStore } from './theme.store.js';
import { createUserStore } from './user.store.js';

// On a server there is no `localStorage`. The stores are made when a module is loaded, so they
// must not throw there: they just have nothing remembered, and remember nothing.
describe('the stores where there is no localStorage', () => {
  it('has no localStorage here, as on a server', () => {
    expect(typeof localStorage).toBe('undefined');
  });

  it('makes the theme store with the default theme, and it toggles', () => {
    const store = createThemeStore();

    expect(store.getState().theme).toBe('dark');

    store.getState().toggleTheme();

    expect(store.getState().theme).toBe('light');
  });

  it('makes the user store with no user, and it sets and forgets one', () => {
    const store = createUserStore<{ id: string }>({ storageKey: 'user' });

    expect(store.getState().user).toBeNull();

    store.getState().setUser({ id: '1' });
    expect(store.getState().authenticated).toBe(true);

    store.getState().setUser(null);
    expect(store.getState().authenticated).toBe(false);
  });

  it('makes the actions store', () => {
    expect(createActionsStore().getState().actions).toEqual([]);
  });
});
