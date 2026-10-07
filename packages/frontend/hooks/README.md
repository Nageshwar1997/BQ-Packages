# @beautinique/frontend-hooks

Shared React hooks for the Beautinique frontends (`BQ-Client`, `BQ-Admin`, `BQ-Seller`, `BQ-Master`).

Hooks are added one by one. All hooks are **named exports**, and all of them are safe to render on the server and under React `StrictMode`.

## Installation

```bash
npm install @beautinique/frontend-hooks
```

Needs `react` (^19) in the app (peer dependency). The router hooks (`usePathParams`, `useQueryParams`) also need `react-router-dom` (^7).

## Hooks

### `useDebounce`

Delays calling `callback` until `delay` ms after the **last** `trigger()` call. Returns `{ trigger, cancel }`.

```tsx
import { useDebounce } from '@beautinique/frontend-hooks';

const { trigger: handleSearch, cancel } = useDebounce({
  callback: (query: string) => {
    runSearch(query);
  },
  delay: 300, // default 500
});

<input onChange={(event) => handleSearch(event.target.value)} />;
```

- Every `trigger(...args)` restarts the timer; only the last call's args reach `callback`.
- The `callback` that runs is the one from the **latest render**, even if it changed after `trigger()` was called, so it never sees stale state.
- `trigger` and `cancel` keep the same identity between renders, so an inline `callback` is fine (only a new `delay` gives a new `trigger`). They are safe in dependency arrays.
- A call that is already pending keeps the delay it was scheduled with.
- `cancel()` drops the pending call - use it when you sometimes have to commit a value immediately, otherwise a still-pending earlier `trigger()` would fire later with stale data.
- A pending call is cancelled when the component unmounts, and a `trigger()` made after that is ignored.

### `useIsSmallScreen`

`true` while the viewport is at most `width` px wide (`(max-width: ${width}px)`), updated live when the window is resized. `width` defaults to `1023`.

```tsx
import { useIsSmallScreen } from '@beautinique/frontend-hooks';

const isMobile = useIsSmallScreen(767);
```

- The first client render already has the correct value (no `false` then `true` flash on small screens).
- Changing `width` gives the value for the new width straight away.
- Safe to render on the server: there it returns `false` (nothing from `window` is touched), and the real value is used once the page runs in the browser.

### `useOutsideClick`

Calls `callback` when the user presses anywhere **outside** the element the returned ref is attached to.

```tsx
import { useOutsideClick } from '@beautinique/frontend-hooks';

const containerRef = useOutsideClick<HTMLDivElement>(() => setIsOpen(false), { enabled: isOpen });

<div ref={containerRef}>...</div>;
```

- `callback` receives the `pointerdown` event (`PointerEvent`: mouse, touch or pen).
- `options.enabled` turns the listener off (for example while a popup is closed). **Defaults to `true`**, also when you pass an options object without `enabled`.
- Listens for `pointerdown` on `document` in the capture phase, so an inner `stopPropagation()` cannot hide the press.
- The listener is added once, and only re-added when `enabled` changes. The latest `callback` is always used, so an inline function costs nothing.

### `usePathParams`

Current route info in one place. Must be rendered inside a `react-router-dom` router.

```tsx
import { usePathParams } from '@beautinique/frontend-hooks';

const { pathParams, paths, pathname, search, location, navigate } = usePathParams();
// URL: /seller/products/42?tab=info  (route: /seller/products/:productId)
// pathParams -> { productId: '42' }
// paths      -> ['seller', 'products', '42']
```

- `pathParams`: the route's dynamic params (`useParams`).
- `location`: the router location, and its fields (`pathname`, `search`, `hash`, `state`, `key`) are also spread flat on the result.
- `paths`: the pathname split into its non-empty segments.
- `navigate`: React Router's `navigate`.
- The returned object keeps its identity until the location changes. `pathParams` only changes when a param value does (React Router itself builds a new params object whenever its `<Routes>` re-renders), and `paths` only when the pathname does. All safe in dependency arrays.

### `useQueryParams`

Read and update the URL query string (`?a=1&b=2`). Must be rendered inside a `react-router-dom` router.

```tsx
import { useQueryParams } from '@beautinique/frontend-hooks';

const { queryParams, setParams, removeParams, clearParams } = useQueryParams();

setParams({ page: '2' }); // merges into the current params
setParams((prev) => ({ ...prev, page: String(Number(prev.page) + 1) })); // updater form: you return the next params
removeParams('page'); // or removeParams(['page', 'sort'])
clearParams();

// Closing a modal that was opened through a param: replace the entry, so Back does not reopen it
removeParams(['login'], { replace: true });
```

**Reading**

- `queryParams` is a plain object of the current params. A repeated key keeps its **last** value there. It only changes identity when the URL's query string changes, so it is safe in dependency arrays.

**Updating**

- `''`, `null` and `undefined` values are left out of the URL.
- Several updates in a row build on each other, like `setState` updaters: `setParams({ a: '1' }); setParams({ b: '2' });` ends with `?a=1&b=2`. This also holds when the updates come from **different components** that each call `useQueryParams()` (a status select in the page and a debounced search box in a child), and while the router has not finished the previous navigation yet. With a data router (`createBrowserRouter`) `navigate()` only commits the new URL a few ms later, so an update made in that window still builds on the pending one instead of overwriting it.
- A param an update does not touch keeps **all** its values and its position: changing `page` in `?tag=a&tag=b&page=1` leaves both `tag` values alone. A param you set gets exactly one value. With an updater function, "does not touch" means the value you return is the one you were given.
- An update that would leave the query string unchanged does **not navigate** (setting a value that is already there, removing a key that is not there, `clearParams()` with no query), so it never adds a duplicate history entry.
- Every update navigates to the same pathname with the new `search`, as a **new history entry** by default. Pass `{ replace: true }` (second argument of `setParams`/`removeParams`, first of `clearParams`) to replace the current entry instead. Use it for updates the user should not be able to go "Back" to, like closing a modal.
- The hash and the location `state` are not kept.
- `setParams`, `removeParams` and `clearParams` keep the same identity while the URL does not change.

## Development

```bash
npm run test       # vitest (jsdom)
npm run typecheck
npm run lint
npm run build
```

Tests live next to the code (`src/*.test.ts(x)`). They are type-checked and linted with the package, but kept out of `dist` (declarations are emitted from `tsconfig.build.json`).

## Repository

https://github.com/Nageshwar1997/BQ-Packages

## Issues

https://github.com/Nageshwar1997/BQ-Packages/issues

## Author

Nageshwar Pawar
