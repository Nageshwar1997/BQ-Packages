# @beautinique/frontend-components

Shared React UI components for the Beautinique frontends (Vite + React 19 + Tailwind v4).

The components are styled with Tailwind classes and with the tokens (colours, shadows, fonts) of
[`@beautinique/frontend-styles`](../styles/README.md), so an app needs both.

## Installation

```bash
npm install @beautinique/frontend-components @beautinique/frontend-stores @beautinique/frontend-styles @iconify/react
```

Peer dependencies: `react`, `react-dom`, `@iconify/react`, `@beautinique/frontend-styles` and [`@beautinique/frontend-stores`](../stores/README.md) (the toasts are kept in a store that the app makes with it, see [Toasts](#toasts); that needs `zustand` in the app).

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

Components that most screens use live in `/ui`, `/layout`, `/theme` and `/toast`, and the root gives
all of them. Components that few screens use have a path of their own and are **not** in the root, so
an app only bundles what it imports.

| Import path                                        | What it gives                                                                                 |
| -------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| `@beautinique/frontend-components`                 | Everything `/ui`, `/layout`, `/theme` and `/toast` give (the very same values), and the types |
| `@beautinique/frontend-components/ui`              | `Badge`, `Button`, `Divider`, `GradientText`, `Tooltip`                                       |
| `@beautinique/frontend-components/layout`          | `ScrollToTop`                                                                                 |
| `@beautinique/frontend-components/theme`           | `Theme` (the dark / light button)                                                             |
| `@beautinique/frontend-components/toast`           | `ToastContainer`, `Toaster`, the types of the toasts, and what works out what a toast shows   |
| `@beautinique/frontend-components/auth`            | `AuthBottomInstructions`                                                                      |
| `@beautinique/frontend-components/linear-gradient` | `LinearGradient`                                                                              |
| `@beautinique/frontend-components/resend`          | `Resend`                                                                                      |
| `@beautinique/frontend-components/stepper`         | `Stepper`                                                                                     |
| `@beautinique/frontend-components/source.css`      | The `@source` line of the setup above                                                         |

What the root gives can be imported from the root or from its own path, it is the same component
either way:

```ts
import { Button } from '@beautinique/frontend-components'; // or
import { Button } from '@beautinique/frontend-components/ui';

import { Stepper } from '@beautinique/frontend-components/stepper'; // only from its own path
```

The root only re-exports, it does not copy: an app that imports only `Button` from the root bundles the
same as with `/ui` (the bundler leaves out what is not used).

```tsx
import { Button, Tooltip } from '@beautinique/frontend-components';

import { toaster } from '@/utils/toaster'; // made in the app, see Toasts

const App = () => (
  <Tooltip title="Save" description="Ctrl + S">
    <Button
      pattern="primary"
      content="Save"
      buttonProps={{ onClick: () => toaster.success({ title: 'Saved' }) }}
    />
  </Tooltip>
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

### Badge, Divider, GradientText

```tsx
import { Badge, Divider, GradientText } from '@beautinique/frontend-components';

<Badge content="New" />; // `content` is any React content: text, a number, an icon and a text
<Badge content={count > 0 && count} />; // nothing to show (null, undefined, false, '') draws no badge; 0 is shown
<Divider aria-hidden="true" />; // an <hr>; hide it from screen readers when it is only a line
<GradientText type="accent" text="Terms" />; // or <GradientText type="silver">any <b>content</b></GradientText>
<GradientText as={Link} to="/terms" type="accent" text="Terms" />; // the Link of the router, with its props
```

- All three take the attributes of their element (`id`, `data-*`, `aria-*`, `ref`...), and the
  classes you give are added after their own.
- `GradientText` takes `text` **or** `children`, not both (the compiler says so). In forced-colors mode
  (Windows high contrast), where a gradient is not drawn, the text takes the colour of the system
  instead of vanishing.

### LinearGradient

```tsx
import { LinearGradient } from '@beautinique/frontend-components/linear-gradient';

<div className="relative overflow-x-auto">
  <LinearGradient position="left" />
  {/* the scrolling content */}
  <LinearGradient position="right" />
</div>;
```

A fade in the background colour over one edge (`top`, `bottom`, `left` or `right`) of a `relative`
container: it shows that there is more to scroll. It is decoration: the pointer goes through it and
assistive technology skips it.

### Stepper

```tsx
import { Stepper } from '@beautinique/frontend-components/stepper';

<Stepper
  label="Checkout progress"
  activeStep={1}
  steps={[
    { title: 'Account', description: 'Create your account' },
    { title: 'Address', description: 'Where to deliver', icon: 'solar:map-point-linear' },
    { title: 'Payment', disabled: true },
  ]}
  onStepClick={(index) => setStep(index)} // optional: with it the steps are buttons
>
  {/* optional: shown under the steps */}
</Stepper>;
```

- The steps are an ordered list and the current one has `aria-current="step"`. A completed step shows a
  tick, and says "Completed" to a screen reader (`completedLabel` for another word).
- `activeStep` is kept inside the steps (`99` is the last one, `NaN` the first).
- With `onStepClick` the steps are real buttons (keyboard, focus ring); a step with `disabled` cannot be
  clicked. Without it nothing in the stepper is a button.
- The tick is bundled with the package (registered with Iconify when a stepper renders), so it needs no
  network. The `icon` of a step is an Iconify name that Iconify downloads the first time it is shown;
  to have one offline, add it to the app with `addCollection`.

### Resend

```tsx
import { Resend } from '@beautinique/frontend-components/resend';

<Resend
  label="Not received OTP?"
  count={sendCount >= 3 ? 0 : 30} // seconds to wait; 0 = no wait
  onResend={handleResendOtp} // may return a promise
/>;
```

- "Resend in 30s", and when the wait is over a button. The wait starts when the component is shown and
  again after each resend, with the `count` of that moment. A new email address? Give it a new `key`.
- **It is measured against the clock**, not counted tick by tick: a background tab, or a laptop that
  slept, does not make people wait longer than the time that really went by.
- If `onResend` returns a promise the button waits for it (disabled, "Sending…", no double click)
  and the wait starts when it resolves. If it rejects there is no wait, the button can be pressed
  again and the error is reported to `window` (`reportError`). Handle the errors you can recover
  from (a toast) inside it.
- A screen reader is not told the number every second (`role="timer"`), but is told once when the
  button is back. The words (`resendLabel`, `countdownLabel`, `sendingLabel`, `readyLabel`,
  `formatSeconds`) can be changed for another language.

### Theme

```tsx
import { Theme } from '@beautinique/frontend-components';
import { createThemeStore } from '@beautinique/frontend-stores';

export const useThemeStore = createThemeStore(); // once, in a module of the app

<Theme store={useThemeStore} />;
```

A button that switches between the dark and the light theme (a sun while it is dark, a moon while it
is light). It only changes the store, which remembers the choice; putting the theme on the page is the
app's. Its name for assistive technology follows the theme ("Switch to light theme"; `labels` changes
the words). The icons move; for a person who asked for less motion (`prefers-reduced-motion`) it
shows still ones.

### ScrollToTop

```tsx
import { ScrollToTop } from '@beautinique/frontend-components';

const { pathname } = useLocation(); // from the router of the app

<div id="main">
  <ScrollToTop pathname={pathname} />
</div>;
```

Scrolls the element with `id="main"` to its top each time `pathname` changes (a router does not do it
for a single page app). It draws nothing. `id`, `behavior`, `block` and `inline` are the `id` of the
element and the options of `scrollIntoView` (`'auto'`, `'start'` and `'nearest'` unless told another);
a `'smooth'` scroll is made `'auto'` for a person who asked for less motion. `skipInitial` leaves the
first page where it is (when the browser restores the scroll on a reload).

### AuthBottomInstructions

```tsx
import { AuthBottomInstructions } from '@beautinique/frontend-components/auth';
import { Link } from 'react-router-dom';

<AuthBottomInstructions as={Link} terms={{ to: '/terms' }} privacy={{ to: '/privacy' }} />;
// "By continuing, you agree to our Terms & Conditions and Privacy Policy."
```

The small print under a sign-in form. `as` is what makes the links (`'a'` unless told another; for `'a'`
the compiler asks for `href`), `terms` and `privacy` are the props of those links. `termsLabel`,
`privacyLabel` and `message` change the words:

```tsx
<AuthBottomInstructions
  terms={{ href: '/terms' }}
  privacy={{ href: '/privacy' }}
  message={({ terms, privacy }) => (
    <>
      Entering means you accept our {terms} and our {privacy}.
    </>
  )}
/>
```

### Toasts

This package draws the toasts; the store that keeps them and the `toaster` that shows them are [`@beautinique/frontend-stores`](../stores/README.md)'s. The store is **made by the app**, once, with the toasts of this package, and given to the two things that need it: the `ToastContainer` here, as a prop, and `createToaster` of the stores package. This package holds no store and no toaster of its own, and exports none.

```ts
// src/stores/toast.store.ts
import type { TToast } from '@beautinique/frontend-components';
import { createToastStore } from '@beautinique/frontend-stores';

export const useToastStore = createToastStore<TToast>();
```

```ts
// src/utils/toaster.ts - the toaster and the helpers, for the rest of the app to import
import { createToaster } from '@beautinique/frontend-stores';

import { useToastStore } from '@/stores/toast.store';

export const {
  toaster,
  withProgressToast,
  withUploadsToast,
  runUploadsInToast,
  createUploadsToast,
} = createToaster(useToastStore);
```

```tsx
// once, near the root of the app
import { ToastContainer } from '@beautinique/frontend-components';

<ToastContainer store={useToastStore} />;
```

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
`withUploadsToast` and `runUploadsInToast` for several) come out of `createToaster` too, and are described in the [stores README](../stores/README.md#createtoasterstore). The toast draws what they show: the overall progress on the left and a row (waiting, uploading, done or failed) for each upload.

**The store has to be one.** The container and `createToaster` must be given the same store: a toast added to a store that no container draws is never shown. Make it once (a module of the app, imported from there) and the two cannot differ. The compiler checks it: the container takes a store of this package's `TToast`, and `createToaster` takes its types from the store it is given.

The icons of the toasts are bundled, so a toast shows its icon without a network.

## Rules for the code of this package

- **The package holds no state.** The toast store is made by the app (`createToastStore` of `@beautinique/frontend-stores`, with this package's `TToast`) and given in, to the `ToastContainer` as a prop. The toaster is the stores package's too (`createToaster`). Nothing here makes a store or a toaster, or exports one, so the package can never be the cause of two stores. The root only re-exports `/ui`, `/layout`, `/theme` and `/toast` (`tsup.config.ts` keeps them external, and `built-files.test.ts` checks the built files after `npm run build`).
- **The root has what most screens use** (`/ui`, `/layout`, `/theme` and `/toast`). A component that
  few screens use gets a path of its own and is not in the root.
- **Icons are Iconify icons, bundled and registered.** A component draws its icons with Iconify's
  `Icon`, and the icon data is in the package (`toast-icons.ts`, `stepper-icons.ts`,
  `theme-icons.ts`, registered with `addCollection`), so they show without a network and without
  waiting for the Iconify API. A component registers its own icons when it renders (not when its file
  is imported), so an app only carries the icons of the components it uses. Iconify draws icons in the
  browser only: on a server a placeholder is in their place (fine for the Vite apps).
- **Components are accessible by default**: real elements (`button`, `ol`, `hr`), names for what has no
  text, a focus ring for the keyboard (`focus-visible`), `prefers-reduced-motion` and forced-colors
  mode taken care of, and nothing that moves or announces every second.
- **A component's own css lives next to the component** and is imported by it, not by the styles
  package. It uses the variables of the styles package (`var(--smoke-eerie)`, ...) and does not
  import them again: importing them a second time, after the app's own css, would undo the app's
  overrides.
- **No imports from an app.** What a component needs from its app comes in through props.

## Development

```bash
npm run build        # dist (needed by the playground and by the type check of the playground)
                     # `@beautinique/frontend-stores` has to be built first (`npm run build` at the root of the repo does it in order)
npm run playground   # http://localhost:4200 - the components, in a real browser
npm test
```

After a rebuild of `dist` restart the playground (or touch `playground/index.css`): Tailwind looks for class names in `dist` when the css is processed, so a class that is new in `dist` is not generated until then. An app that installs the package from npm does not have this, it builds with the package as it is.

The playground (`playground/`) is a small Vite page that uses the package through its public import
paths, the way an app does. It is not published (`files` in `package.json` leaves it out).
