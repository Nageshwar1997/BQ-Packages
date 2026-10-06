# @beautinique/frontend-hooks

Shared React hooks for the Beautinique frontends (`BQ-Client`, `BQ-Admin`, `BQ-Seller`, `BQ-Master`).

Hooks are added one by one. All hooks are **named exports**.

## Installation

```bash
npm install @beautinique/frontend-hooks
```

Needs `react` (^19) in the app (peer dependency).

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
- `cancel()` drops the pending call - use it when you sometimes have to commit a value immediately, otherwise a still-pending earlier `trigger()` would fire later with stale data.
- A pending call is cancelled automatically when the component unmounts.
- `trigger` and `cancel` keep the same identity between renders while `callback` and `delay` are unchanged (wrap `callback` in `useCallback` if you need that).

### `useIsSmallScreen`

`true` while the viewport is at most `width` px wide (`(max-width: ${width}px)`), updated live when the window is resized. `width` defaults to `1023`.

```tsx
import { useIsSmallScreen } from '@beautinique/frontend-hooks';

const isMobile = useIsSmallScreen(767);
```

- The first render already has the correct value (no `false` then `true` flash on small screens).
- Uses `window.matchMedia`, so it needs a browser (client-side rendering, not SSR).

### `useOutsideClick`

Calls `callback` when the user presses anywhere **outside** the element the returned ref is attached to.

```tsx
import { useOutsideClick } from '@beautinique/frontend-hooks';

const containerRef = useOutsideClick<HTMLDivElement>(() => setIsOpen(false), { enabled: isOpen });

<div ref={containerRef}>...</div>;
```

- `options.enabled` turns the listener off (for example while a popup is closed). **Defaults to `true`**, also when you pass an options object without `enabled`.
- Listens for `pointerdown` on `document` in the capture phase, so an inner `stopPropagation()` cannot hide the press.
- The listener is re-attached when `callback` changes; pass a stable callback (`useCallback`) to avoid that.

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

### `useQueryParams`

Read and update the URL query string (`?a=1&b=2`). Must be rendered inside a `react-router-dom` router.

```tsx
import { useQueryParams } from '@beautinique/frontend-hooks';

const { queryParams, setParams, removeParams, clearParams } = useQueryParams();

setParams({ page: '2' }); // merges into the current params
setParams((prev) => ({ page: String(Number(prev.page) + 1) })); // updater form replaces them
removeParams('page'); // or removeParams(['page', 'sort'])
clearParams();
```

- `queryParams` is a plain object of the current params. A repeated key keeps its **last** value. It is rebuilt on every render, so use its values (not its identity) in effect dependencies.
- `setParams` drops `''`, `null` and `undefined` values from the URL.
- Every update navigates to the same pathname with the new `search` as a **new history entry**. It does not keep the hash or the location `state`.
- `setParams`, `removeParams` and `clearParams` keep the same identity while the URL does not change.

## Development

```bash
npm run test       # vitest (jsdom)
npm run typecheck
npm run lint
npm run build
```

Tests live next to the hook (`src/*.test.ts`). They are type-checked and linted with the package, but kept out of `dist` (declarations are emitted from `tsconfig.build.json`).

## Repository

https://github.com/Nageshwar1997/BQ-Packages

## Issues

https://github.com/Nageshwar1997/BQ-Packages/issues

## Author

Nageshwar Pawar
