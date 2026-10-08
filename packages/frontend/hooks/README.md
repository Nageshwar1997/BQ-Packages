# @beautinique/frontend-hooks

Shared React hooks for the Beautinique frontends (`BQ-Client`, `BQ-Admin`, `BQ-Seller`, `BQ-Master`).

Hooks are added one by one. All hooks are **named exports**, and all of them are safe to render on the server and under React `StrictMode`.

## Installation

```bash
npm install @beautinique/frontend-hooks
```

Needs `react` (^19) in the app (peer dependency). The router hooks (`usePathParams`, `useQueryParams`, `useQueryParamInput`) also need `react-router-dom` (^7).

## Hooks

### `useDebounce`

Delays calling `callback` until `delay` ms after the **last** `trigger()` call. Returns `{ trigger, cancel, flush, isPending }`.

```tsx
import { useDebounce } from '@beautinique/frontend-hooks';

const {
  trigger: handleSearch,
  cancel,
  flush,
  isPending,
} = useDebounce({
  callback: (query: string) => {
    runSearch(query);
  },
  delay: 300, // default 500
});

<input
  onChange={(event) => handleSearch(event.target.value)}
  onKeyDown={(event) => event.key === 'Enter' && flush()} // run the waiting call now
/>;
```

- Every `trigger(...args)` restarts the timer; only the last call's args reach `callback`.
- The `callback` that runs is the one from the **latest render**, even if it changed after `trigger()` was called, so it never sees stale state.
- `trigger`, `cancel`, `flush` and `isPending` keep the same identity between renders, so an inline `callback` is fine (only a new `delay` gives a new `trigger`). They are safe in dependency arrays.
- A call that is already pending keeps the delay it was scheduled with.
- `cancel()` drops the pending call - use it when you sometimes have to commit a value immediately, otherwise a still-pending earlier `trigger()` would fire later with stale data.
- `flush()` runs the pending call **now**, with its args (and the latest `callback`), and nothing runs again when its time would have come. It does nothing when no call is pending. The callback may `trigger()` again.
- `isPending()` says whether a call is waiting. Like `flush`, it is a function that reads the current state, not a value, so asking never causes a re-render.
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
- `useIsSmallScreen(width, { serverValue })`: if you know the visitor's device on the server (a user-agent or client-hint guess), pass it as `serverValue` and the server markup and the hydration render use it instead of `false`, so a phone does not flash the desktop layout first. The real value replaces it right after hydration, and a plain client render never uses it.
- One `MediaQueryList` is created per query (not on every render), and without `window.matchMedia` the hook stays `false`.

### `useOnlineStatus`

Whether the user can reach the internet, for showing "offline" / "connecting" / "back online" in the UI.

```tsx
import { useOnlineStatus } from '@beautinique/frontend-hooks';

const { status, isOnline, isOffline, isConnecting, recheck } = useOnlineStatus();
// status: 'online' | 'offline' | 'connecting'
```

| Status       | Meaning                                                                                                         |
| ------------ | --------------------------------------------------------------------------------------------------------------- |
| `online`     | The internet works (or nothing says it does not).                                                               |
| `offline`    | The browser says the device has no network, **or** the Wi-Fi is joined but the internet stopped answering.      |
| `connecting` | The browser says the network is back, but the internet has not answered yet. It turns `online` once it answers. |

How it decides:

- The browser's `online` / `offline` events are a trigger, never the proof. `navigator.onLine` being `true` only means a network interface is up, so after the network comes back the status is `connecting` until a real request gets an answer (retried after 0.5 s, 1 s, 2 s, then every 3 s).
- The browser says **nothing** when the Wi-Fi has no internet behind it (a phone hotspot with its data switched off). So, while online and while the tab is visible, the internet is also asked every 15 seconds. A check that gets no answer is repeated once after 0.5 s; two in a row without an answer make the status `offline`, and the first answer makes it `online` again, by itself. A tab that wakes up asks at once.
- The check is a tiny request (`no-cors`, no cookies, no referrer) to Google's and Cloudflare's connectivity-check addresses (`generate_204`). **Any** answer counts, an error page included, and it is online if either one answers. Only when neither does, and the site is not on a local or private address, the site's own `/favicon.ico` is asked too. On `localhost` the site itself is never asked, because it always answers and would say "online" with the cable pulled.
- Every component that uses the hook shares one listener and one check, and nothing runs (no listener, timer or request) while no component uses it.
- The first client render is already right, and a server (or the first hydration render) always says `online`, so a page never starts with an "offline" message that is then taken back.

Helping it with the app's own requests (code outside React, e.g. an API client):

```ts
import { onlineStatusStore } from '@beautinique/frontend-hooks';

axios.interceptors.response.use(
  (response) => {
    onlineStatusStore.confirmOnline(); // the server answered: the internet works
    return response;
  },
  (error) => {
    if (error.response)
      onlineStatusStore.confirmOnline(); // an error page is an answer too
    else if (!axios.isCancel(error)) onlineStatusStore.recheck(); // no answer: go and look
    return Promise.reject(error);
  },
);
```

- `confirmOnline()` is better proof than a check: the status becomes `online` at once if it was `connecting` or `offline` because nothing answered, and the regular 15 s check is postponed, so while the app is busy talking to its server no extra requests are made. It is ignored while the browser says there is no network (an answer could only come from a cache).
- `recheck()` asks now (only while online and nothing is being checked). The user is not told "offline" for one failed request, see the repeat above.
- `onlineStatusStore.getStatus()` and `onlineStatusStore.subscribe(listener)` follow the status outside React.

With TanStack Query, give its `onlineManager` the real status, so queries and mutations **wait** while there is no internet (instead of failing and showing errors) and carry on when it is back:

```ts
import { onlineManager } from '@tanstack/react-query';
import { onlineStatusStore } from '@beautinique/frontend-hooks';

onlineManager.setEventListener((setOnline) => {
  const sync = () => setOnline(onlineStatusStore.getStatus() === 'online');
  sync();
  return onlineStatusStore.subscribe(sync);
});
```

Another probe, interval or wait between tries: make a store once (outside of any component) and pass it to the hook.

```ts
import { createOnlineStatusStore, useOnlineStatus } from '@beautinique/frontend-hooks';

const store = createOnlineStatusStore({
  probe: (signal) => fetch('/health', { method: 'HEAD', cache: 'no-store', signal }), // resolves = reachable, rejects = not
  probeTimeoutMs: 5000, // one probe may take this long (default 5000)
  heartbeatMs: 30_000, // how often to check while online; 0 turns the regular check off (default 15000)
  retryDelayMs: (failures) => Math.min(500 * failures, 3000), // wait before the next try (default 0.5 s, 1 s, 2 s, 3 s)
});

const { isOffline } = useOnlineStatus(store);
```

- Nothing is asked unless a component uses the hook (or something subscribed to the store), and the regular check only runs while a tab is visible.
- It does **not** make an app work offline (caching and queueing are yours), and a full page reload still needs the network.
- To try it: Chrome DevTools > Network > **Offline**, or switch the data off on the phone that shares its connection. Both read the same way.

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
- "Inside" comes from the path the event took (`event.composedPath()`), not from `element.contains(event.target)`. That path is fixed when the event is dispatched, so a press still counts as inside if another listener removed the pressed node first, and it works for an element inside an (open) shadow root, where `event.target` is the shadow host.
- The listener is added once, and only re-added when `enabled` (or whether `onFocusOutside` is given) changes. The latest `callback`, `ignore` and `onFocusOutside` are always used, so inline functions and arrays cost nothing.

#### Popups rendered with `createPortal`

A popup portalled to `document.body` is not inside the element in the DOM, so a press on it would count as outside. List its ref in `options.ignore`:

```tsx
const dropdownRef = useRef<HTMLDivElement | null>(null);
const containerRef = useOutsideClick<HTMLDivElement>(() => setIsOpen(false), {
  enabled: isOpen,
  ignore: [dropdownRef], // a press on the options list is not an outside press
});

<div ref={containerRef}>
  <button onClick={() => setIsOpen((open) => !open)}>Open</button>
  {isOpen && createPortal(<ul ref={dropdownRef}>...</ul>, document.body)}
</div>;
```

A ref that is not attached (popup closed) is skipped.

#### Keyboard focus leaving

`options.onFocusOutside` is called with the `FocusEvent` when focus moves to an element outside (Tab, or a script). Without it focus is not watched at all. Focus leaving the browser window is not reported. A press on a focusable element outside calls `callback` (the press) and then `onFocusOutside` (the focus), so give both an idempotent function such as the one that closes:

```tsx
const close = () => setIsOpen(false);
const containerRef = useOutsideClick<HTMLDivElement>(close, {
  enabled: isOpen,
  onFocusOutside: close,
});
```

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
- `location`: the router location, and its fields (`pathname`, `search`, `hash`, `state`, `key`) are also spread flat on the result. Both are the same values and change together: use the flat field when you need one (`const { pathname } = usePathParams()`), and `location` when you pass the whole object on (`<Navigate state={location} />`, `useBlocker`, comparing two locations).
- `paths`: the pathname split into its non-empty segments.
- `navigate`: React Router's `navigate`.
- The returned object keeps its identity until the location changes. `pathParams` only changes when a param value does (React Router itself builds a new params object whenever its `<Routes>` re-renders), and `paths` only when the pathname does. All safe in dependency arrays.
- With a `useBlocker` on the page, nothing here moves while a navigation is blocked (the router's location does not move): `reset()` leaves it as it was and `proceed()` moves it.

#### Typing the params

The page that renders a route knows its params, so it can say their names once:

```tsx
const { pathParams } = usePathParams<'categoryL1' | 'slug'>();

pathParams.slug; // string | undefined
pathParams.slgu; // type error: misspelt key
```

A record type works too (`usePathParams<{ slug?: string }>()`). Without a type argument any key is allowed, exactly as before.

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
- A param an update does not touch keeps **all** its non-blank values and its position: changing `page` in `?tag=a&tag=b&page=1` leaves both `tag` values alone. A param you set gets exactly one value. With an updater function, "does not touch" means the value you return is the one you were given.
- Order: with an object update (`setParams({ ... })`, `removeParams`) the URL keeps its own order and new params go at the end. With an **updater function** the order of the object you return is used, and JavaScript always lists keys that look like numbers (`"2"`) first.
- An update that would leave the query string unchanged does **not navigate** (setting a value that is already there, removing a key that is not there, `clearParams()` with no query), so it never adds a duplicate history entry.
- Every update navigates to the same pathname with the new `search`, as a **new history entry** by default. Pass `{ replace: true }` (second argument of `setParams`/`removeParams`, first of `clearParams`) to replace the current entry instead. Use it for updates the user should not be able to go "Back" to, like closing a modal.
- The **hash** (`#reviews`) is kept; the location `state` is not.
- `setParams`, `removeParams` and `clearParams` keep the same identity while the URL does not change.

**With a data router** (`createBrowserRouter`) an update builds on what the router says the URL is, or is about to be - never on a URL that did not happen:

- a navigation still in flight, whoever started it (a link, `navigate()`...): the update builds on its target, so nothing is lost;
- an update held by `useBlocker`: while the dialog is open the next update builds on the held one (`proceed()` goes to the last held target, so both apply), and after `reset()` it builds on the URL the user is really on. A held Back/Forward or link is not ours and is ignored;
- an update that was replaced by a newer navigation, redirected by a loader, or that failed: the next update builds on where the user ended up.

With a declarative router (`BrowserRouter`, `MemoryRouter`) there is no router state to ask, so a pending update is remembered until the URL shows it (or for 2 seconds at most).

The hook never registers a blocker itself (a router only runs one `useBlocker`). It reads the router through React Router's `UNSAFE_DataRouterContext`, like React Router's own internals do; if that were ever unavailable it behaves as with a declarative router. A page is assumed to have one router. If two copies of this package end up on the same page, they share what is pending.

### `useQueryParamInput`

A text box that is mirrored in a URL query param - a search box and `?search=...`. Builds on `useQueryParams`, so it must be rendered inside a `react-router-dom` router too. Returns `{ value, setValue, clear, flush, isPending }`.

```tsx
import { useQueryParamInput } from '@beautinique/frontend-hooks';

const search = useQueryParamInput('search'); // or useQueryParamInput('search', { delay: 300 }), default 600

<input value={search.value} onChange={(event) => search.setValue(event.target.value)} />
<button onClick={() => { search.clear(); clearParams(); }}>Clear</button>
```

**Typing**

- `setValue(text)` shows `text` in the box right away (leading whitespace is removed) and writes it to the URL `delay` ms after the **last** call. Only the trimmed text goes into the URL, and the param is removed when the text is empty. A trailing space stays in the box, so the user can keep typing "lip " -> "lip gloss".
- Other params are left alone, and writing goes through `setParams`/`removeParams`, so it has the same history and cross-component behavior as `useQueryParams`.

**Following the URL**

- When the param changes by itself - another filter resets it, the user presses Back/Forward, a "Clear filters" button calls `clearParams()` - the box follows it.
- The URL update the box made itself coming back does **not** touch the box. This matters with a data router, where the URL commits a few ms after typing: whatever the user typed in the meantime is kept. The same holds when several updates are on their way at once (fast typing, a slow navigation): an older one that lands after a newer one was sent does not move the box back.
- A typed text that is still waiting for its debounce is dropped when the box was changed in the meantime (for example reset by another filter), so an old search cannot reappear in the URL.
- A URL value with a leading space (`?search=%20lip`) is shown without it, like typing does.

**`useBlocker`, redirects and replaced updates**

- An update that `useBlocker` holds is still _expected_: `proceed()` delivers it, so the box does not follow it as if somebody else had changed the URL, and what the user typed meanwhile stays. If the blocker is `reset()` it is not expected any more, and a later URL with the same text is followed like any other change.
- An update that a loader redirected, that another navigation replaced, or that failed will never arrive, so it is not expected either.
- While an update is held the box keeps the text the user typed, so box and URL differ until the user sends again (or the URL changes).
- A text that makes no change to the URL (the URL has it already) is not sent and not expected.

**Sending now**

- `flush()` sends the waiting text at once (for example on Enter) and nothing is sent again when the delay is over. It does nothing when nothing is waiting.
- `isPending()` says whether a typed text is waiting for its delay. It is a function, so asking never causes a re-render.

**Clearing**

- `clear()` empties the box at once and drops the text waiting for its debounce. It does **not** touch the URL: pair it with `removeParams`/`clearParams` when the URL has to be cleared as well.
- If a URL update of the box is already on its way when `clear()` is called, the box ends up showing whatever the URL ended up with, never something different from it.
- `value` is a string; `setValue`, `clear`, `flush` and `isPending` keep the same identity, and the returned object only changes when `value` does.
- Only text values are supported, and a page is assumed to have one router.

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
