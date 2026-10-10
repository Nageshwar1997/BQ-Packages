# @beautinique/frontend-components

Shared React UI components for the Beautinique frontends (Vite + React 19 + Tailwind v4).

The components are styled with Tailwind classes and with the tokens (colours, shadows, fonts) of
[`@beautinique/frontend-styles`](../styles/README.md), so an app needs both.

## Installation

```bash
npm install @beautinique/frontend-components @beautinique/frontend-styles @iconify/react
```

Peer dependencies: `react`, `react-dom`, `@iconify/react`, `@beautinique/frontend-styles`.

## Setup (once per app)

In the app's own `index.css`, in this order:

```css
@import '@beautinique/frontend-styles';
@import '@beautinique/frontend-components/source.css';
@import './app.css';
```

`source.css` is not optional. Tailwind v4 does not look for class names inside `node_modules`, so
without it the classes the components use (`rounded-lg`, `shadow-primary-btn`, ...) are never
generated and the components come out unstyled. (The playground has a page that shows exactly that.)

## Import paths

Components that most screens use live in `/ui` (and, later, `/layout`). Components that few screens
use have a path of their own, so an app only bundles what it imports.

| Import path                                   | What it gives                                                                                |
| --------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `@beautinique/frontend-components`            | Types only (`IButton`, `ITooltip`, ...)                                                      |
| `@beautinique/frontend-components/ui`         | `Button`, `Tooltip`                                                                          |
| `@beautinique/frontend-components/toast`      | `ToastContainer`, `toaster`, the toast store, and the helpers for toasts that follow uploads |
| `@beautinique/frontend-components/source.css` | The `@source` line of the setup above                                                        |

```tsx
import { Button, Tooltip } from '@beautinique/frontend-components/ui';
import { ToastContainer, toaster } from '@beautinique/frontend-components/toast';

const App = () => (
  <>
    <ToastContainer /> {/* once, near the root of the app */}
    <Tooltip title="Save" description="Ctrl + S">
      <Button
        pattern="primary"
        content="Save"
        buttonProps={{ onClick: () => toaster.success({ title: 'Saved' }) }}
      />
    </Tooltip>
  </>
);
```

### Button

```tsx
const save = <Button pattern="primary" content="Save" buttonProps={{ type: 'submit' }} />;

// only an icon: it has to be given a name, a screen reader reads it (`aria-labelledby` works too)
const edit = (
  <Button
    pattern="outline"
    content={{ icon: 'solar:pen-linear' }}
    buttonProps={{ 'aria-label': 'Edit category' }}
  />
);
```

- **Classes you give are added after the button's own and none of its own is removed.** To win over
  one of them make it important with `!`: `className="rounded-md! px-2! lg:px-2!"`. The button has
  classes for large screens (`lg:px-5`, `lg:py-4`, `xl:text-base`), they are other classes than
  `px-4` and so on, so to change the padding on every screen give the `lg:` one too.
- **`ref`** is the `<button>` itself: `<Button ref={buttonRef} ... />`.
- A button with only an icon does not compile without `aria-label` or `aria-labelledby` in
  `buttonProps`.

### Tooltip

```tsx
const hint = (
  <Tooltip title="Save" description="Ctrl + S" placement="right">
    <Button pattern="primary" content="Save" />
  </Tooltip>
);
```

- It opens on hover and on focus, and closes on mouse leave, blur or **Escape**.
- **It stays inside the window**: with no room on the side asked for (`placement`) it opens on the
  opposite side, and it is pushed along the edge to keep 8px from it, the arrow still pointing at
  the content.
- **For a screen reader** it is `role="tooltip"` and, while it is open, the content is described by it
  (`aria-describedby` is put on the child element, next to what it already has).
- **`required={false}` shows only the content.** The wrapper stays (as `display: contents`, it takes
  no room), so `required` can change while the page is open (a locked field, the size of the
  screen) without the content being created again and losing its state. One difference to a tooltip
  that is not there at all: the content is one level deeper in the DOM, so a css rule that looks at
  the parent of the content (`space-y-*` on a parent, `> :first-child`) sees the wrapper.

### Toasts

`toaster` works from anywhere (an API client, a store), not only from components:

```tsx
toaster.success({ title: 'Saved', description: 'Your changes were saved.' });
toaster.error({ title: 'Failed' });
toaster.warning({ title: 'Careful' });
toaster.default({ title: 'Heads up' });
toaster.loading({ title: 'Working' });
toaster.custom({ type: 'custom', children: <p>Any React content</p> });
```

Toasts that follow uploads (`withProgressToast` for one request, `createUploadsToast`,
`withUploadsToast` and `runUploadsInToast` for several) are described in `src/toast/uploads.ts`.
`runUploadsInToast` shows one toast for the uploads of several fields: the overall progress on the
left and a row (waiting, uploading, done or failed) for each field that has files.

The icons of the toasts are bundled, so a toast shows its icon without a network.

## Rules for the code of this package

- **State lives in exactly one import path.** The toast store is part of `/toast` only. A component
  of another path that needs it must import it from `@beautinique/frontend-components/toast`, never
  copy it: every entry is built as one file, so a copy would be a second store, and a toast shown
  through it would never reach the `ToastContainer`.
- **A component's own css lives next to the component** and is imported by it, not by the styles
  package. It uses the variables of the styles package (`var(--smoke-eerie)`, ...) and does not
  import them again: importing them a second time, after the app's own css, would undo the app's
  overrides.
- **No imports from an app.** What a component needs from its app comes in through props.

## Development

```bash
npm run build        # dist (needed by the playground and by the type check of the playground)
npm run playground   # http://localhost:4200 - the components, in a real browser
npm test
```

After a rebuild of `dist` restart the playground (or touch `playground/index.css`): Tailwind looks for class names in `dist` when the css is processed, so a class that is new in `dist` is not generated until then. An app that installs the package from npm does not have this, it builds with the package as it is.

The playground (`playground/`) is a small Vite page that uses the package through its public import
paths, the way an app does. It is not published (`files` in `package.json` leaves it out).
