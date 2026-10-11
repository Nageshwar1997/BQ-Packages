# @beautinique/frontend-stores

The shared [zustand](https://zustand.docs.pmnd.rs) stores of the Beautinique frontends (`BQ-Client`, `BQ-Admin`, `BQ-Seller`, `BQ-Master`): **theme**, **user**, **actions** (a queue of actions that are tried again) and **toast** (the toasts that are shown).

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

### `createToastStore<TToast>()`

The toasts that are shown: `add`, `update.progress`, `update.uploadItem` and `remove`. `TToast` is a union with one `type` for each kind of toast of whoever shows them (a toast that follows an upload has the type `'progress'`, one with a row per upload has the type `'uploads'` and its `items`).

```ts
type TToast =
  | { type: 'success'; title: string }
  | { type: 'progress'; title: string; progress: number }
  | { type: 'uploads'; title: string; items: IUploadItem[] };

export const useToastStore = createToastStore<TToast>();

const id = useToastStore.getState().add({ type: 'progress', title: 'Uploading', progress: 0 });
useToastStore.getState().update.progress(id, 40);
useToastStore.getState().remove(id);
```

State: `{ toasts, add(toast), update: { progress(id, progress), uploadItem(id, itemId, patch) }, remove(id) }`. `add` gives the id of the toast. `update.progress` only changes a toast of the type `'progress'`, `update.uploadItem` only one of the type `'uploads'`; any other toast with that id is left alone.

**The store has to be one for everything that shows toasts.** What adds a toast (`createToaster`, below) and what draws it (the `ToastContainer` of [`@beautinique/frontend-components`](../components/README.md), which takes the store as a prop) must be given the same store: make it once, in one module of the app, and import it from there.

### `createToaster(store)`

The `toaster` and the helpers that show toasts in a store. The types come from the store (the `TToast` it was made with), so the app gives them once, when it makes the store:

```ts
import type { TToast } from '@beautinique/frontend-components';
import { createToaster, createToastStore } from '@beautinique/frontend-stores';

export const useToastStore = createToastStore<TToast>();
export const {
  toaster,
  withProgressToast,
  withUploadsToast,
  runUploadsInToast,
  createUploadsToast,
} = createToaster(useToastStore);
```

`toaster` works from anywhere (an API client, a store), not only from components:

```ts
toaster.success({ title: 'Saved', description: 'Your changes were saved.' });
toaster.error({ title: 'Failed' });
toaster.warning({ title: 'Careful' });
toaster.default({ title: 'Heads up' });
toaster.loading({ title: 'Working' });
toaster.custom({ type: 'custom', children: <p>Any React content</p> });
toaster.remove(id);
```

What each of them takes is what that kind of toast of the app is made of, without its `type`: `toaster.success({ title })` takes what the toast of the type `'success'` has, a kind the store does not have is an error. The compiler checks it, and `createToaster` takes only a store of toasts.

| What                                          | What it does                                                                                                                                                    |
| --------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `withProgressToast({ title, request })`       | A toast for one request: it follows the progress the request tells (`onProgress({ loaded, total })`, an axios `onUploadProgress` fits) and goes when it is over |
| `withUploadsToast({ title, files, request })` | The toast for one request that uploads several files at once                                                                                                    |
| `runUploadsInToast({ title, uploads, run })`  | One toast for the uploads of several fields: the overall progress, and a row (waiting, uploading, done or failed) for each field that has files                 |
| `createUploadsToast({ title, items })`        | What the two above are made of: one toast for the uploads of `items`, with `item(id).run(request)` for each and `end()` when all are over                       |

An upload is one request, so files are counted from the bytes sent; the toast closes by itself a moment after every upload is over, later when one failed. The uploads toast of the app has to be made of `IUploadItem`s (`{ id, label, status, loaded, total, fileSizes }`, exported here).

## Development

```bash
npm run build       # dist
npm test
npm run typecheck
```

The tests of the types (`src/index.test.ts`) use `@ts-expect-error` lines, which are checked by `npm run typecheck`, not by vitest.
