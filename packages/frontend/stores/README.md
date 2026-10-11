# @beautinique/frontend-stores

The shared [zustand](https://zustand.docs.pmnd.rs) stores of the Beautinique frontends (`BQ-Client`, `BQ-Admin`, `BQ-Seller`, `BQ-Master`): **theme**, **user** and **actions** (a queue of actions that are tried again).

The package does not hold a store itself. It gives **functions that make a store**, and the app calls each of them once, in a variable of its own, and gives the types and what is special to the app (where the user is kept, how it is encrypted). That is how the same store code serves four apps with four different user types.

## Installation

```bash
npm install @beautinique/frontend-stores
```

Needs `react` (^19) and `zustand` (^5) in the app (peer dependencies).

## Usage

One module in the app, one variable per store:

```ts
// src/stores/index.ts (or one file per store)
import {
  createActionsStore,
  createThemeStore,
  createUserStore,
} from '@beautinique/frontend-stores';

import { resetAuthLogoutState } from '@/classes/ApiRequest';
import { USER_KEY } from '@/constants/common.constants';
import type { IUser } from '@/types/api.type';
import type { TTheme } from '@/types/store.type';
import { decryptData, encryptData } from '@/utils/crypto.util';

export const useThemeStore = createThemeStore<TTheme>(); // TTheme = 'dark' | 'light'

export const useUserStore = createUserStore<IUser>({
  storageKey: USER_KEY,
  encode: encryptData,
  decode: (stored) => decryptData<IUser>(stored),
  onSet: resetAuthLogoutState,
});

export const useActionsStore = createActionsStore();
```

What comes out is the usual zustand hook, typed with what the app gave:

```tsx
const user = useUserStore((state) => state.user); // IUser | null
useUserStore.getState().setUser(null);
```

### Call each function once

Every call makes **a store of its own**. Call a function in one module and import the variable from there: two calls, two stores that know nothing of each other.

### `createThemeStore<TTheme>(options?)`

The theme, remembered between visits.

| Option         | Default               | What it is                                                          |
| -------------- | --------------------- | ------------------------------------------------------------------- |
| `themes`       | `['dark', 'light']`   | Every theme, in the order `toggleTheme` goes through them           |
| `defaultTheme` | the first of `themes` | The theme when none that is valid is remembered                     |
| `storageKey`   | `'theme'`             | Where it is remembered                                              |
| `storage`      | `localStorage`        | What remembers it (`sessionStorage`, or anything with `getItem`...) |

State: `{ theme, toggleTheme() }`. With only dark and light, `createThemeStore<TTheme>()` is all that is needed. With other themes the list is needed, and the type comes from it (or is given and checked against it):

```ts
export const useThemeStore = createThemeStore({ themes: ['light', 'dark', 'system'] });
export const useThemeStore = createThemeStore<TTheme>({ themes: ['light', 'dark', 'system'] });
```

The store only keeps the theme. Putting it on the page (`document.documentElement.setAttribute('theme', theme)`) stays in the app.

### `createUserStore<TUser>(options)`

The signed-in user, remembered between visits. `TUser` is the type of the user of the app (any object).

| Option       | Default          | What it is                                                                                                 |
| ------------ | ---------------- | ---------------------------------------------------------------------------------------------------------- |
| `storageKey` | (required)       | Where the user is remembered                                                                               |
| `encode`     | `JSON.stringify` | User to the text that is remembered, e.g. to encrypt it                                                    |
| `decode`     | `JSON.parse`     | The text back to the user, or `null`. A `decode` that throws counts as `null`                              |
| `onSet`      | none             | Called each time a user is set (not when it is forgotten), after it is remembered, before the store has it |
| `storage`    | `localStorage`   | What remembers it                                                                                          |

State: `{ user, authenticated, setUser(user | null) }`. `setUser(null)` forgets the user.

### `createActionsStore(options?)`

A queue of actions that run one after the other, each **tried again with a growing wait** when it fails (e.g. requests that could not be sent while offline).

| Option         | Default               | What it is                                                       |
| -------------- | --------------------- | ---------------------------------------------------------------- |
| `maxRetries`   | `3`                   | How many times an action is tried again before it is dropped     |
| `retryDelayMs` | `500 * 2 ** failures` | The wait before a new try, given how many times it failed before |
| `logger`       | `console`             | Where failures are reported (`error`, `warn`)                    |

State: `{ actions, addAction(fn, { maxRetries }?), removeAction(id), clearActions(), runNextAction(), runAllActions() }`. An action says its own `maxRetries` when it needs one.

## What the stores do that the apps' own copies did not

The first copies of these stores lived in each app. The package keeps what they did and fixes:

- **A storage that is blocked or full does not stop the app.** Reading or writing `localStorage` can throw (private mode, quota). The stores then just forget, and still work. On a server (no `localStorage`) they are made without anything remembered.
- **A bad remembered value does not stop the app from starting** (a `decode` that throws, text that is not JSON): there is no user, that is all.
- **Actions that are added while another runs are kept.** The old queue wrote back the list it had read before the action started, and lost them.
- **An action that is removed while it runs is not brought back** when it fails, and the next action is not dropped when it works.
- **`crypto.randomUUID` is not needed.** It exists only on pages served over https (and localhost); the ids of actions have a fallback.

## Not here: the toast store

The toast store is part of [`@beautinique/frontend-components`](../components/README.md), next to the `ToastContainer` that reads it: the two have to share one store, so they live in the same package.

## Development

```bash
npm run build       # dist
npm test
npm run typecheck
```

The tests of the types (`src/index.test.ts`) use `@ts-expect-error` lines, which are checked by `npm run typecheck`, not by vitest.
