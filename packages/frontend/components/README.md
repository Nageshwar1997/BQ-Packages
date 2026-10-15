# @beautinique/frontend-components

Shared React UI components for the Beautinique frontends (Vite + React 19 + Tailwind v4).

The components are styled with Tailwind classes and with the tokens (colours, shadows, fonts) of
[`@beautinique/frontend-styles`](../styles/README.md), so an app needs both.

## Installation

```bash
npm install @beautinique/frontend-components @beautinique/frontend-stores @beautinique/frontend-styles @iconify/react
```

Peer dependencies: `react`, `react-dom`, `@iconify/react`, `@beautinique/frontend-styles` and [`@beautinique/frontend-stores`](../stores/README.md) (the toasts are kept in a store that the app makes with it, see [Toasts](#toasts); that needs `zustand` in the app).

Two more are **optional**, needed only by the path that uses them (an app that never imports that path does not need them, and the bundler never looks for them):

| Optional peer         | Needed by                                                                                                         |
| --------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `hls.js`              | `/media`, only to play a stream (`.m3u8`) in a browser that cannot play it itself; it is loaded when it is needed |
| `react-color-palette` | `/color-input` (its picker)                                                                                       |

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

Components that most screens use live in `/ui`, `/layout`, `/inputs`, `/theme` and `/toast`, and the root gives
all of them. Components that few screens use have a path of their own and are **not** in the root, so
an app only bundles what it imports.

| Import path                                         | What it gives                                                                                                                                                                                                                    |
| --------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@beautinique/frontend-components`                  | Everything `/ui`, `/layout`, `/inputs`, `/theme` and `/toast` give (the very same values), and the types                                                                                                                         |
| `@beautinique/frontend-components/ui`               | `Badge`, `Button`, `Divider`, `GradientText`, `Tooltip`                                                                                                                                                                          |
| `@beautinique/frontend-components/inputs`           | `Input`, `Textarea`, `Checkbox`, `Radio`, `Select`, and what they are made of: `InputLabel`, `InputError`, `InputIcon`                                                                                                           |
| `@beautinique/frontend-components/layout`           | `ApiStatus`, `BorderGradient`, `ConfirmModal`, `Dropdown`, `LoadingPage`, `LoadingRings`, `LoadingText`, `ModalWrapper`, `NetworkStatusToaster`, `ScrollableGradientContainer`, `ScrollToTop`, `Skeleton`, `Table` and its parts |
| `@beautinique/frontend-components/theme`            | `Theme` (the dark / light button)                                                                                                                                                                                                |
| `@beautinique/frontend-components/toast`            | `ToastContainer`, `Toaster`, the types of the toasts, and what works out what a toast shows                                                                                                                                      |
| `@beautinique/frontend-components/auth`             | `AuthBottomInstructions`, `SocialAuth`                                                                                                                                                                                           |
| `@beautinique/frontend-components/breadcrumb`       | `Breadcrumb`, `getBreadcrumbItems`                                                                                                                                                                                               |
| `@beautinique/frontend-components/color-input`      | `ColorInput` (needs `react-color-palette`)                                                                                                                                                                                       |
| `@beautinique/frontend-components/file-input`       | `FileInput`, `getMediaType`                                                                                                                                                                                                      |
| `@beautinique/frontend-components/hierarchy-select` | `HierarchySelect`                                                                                                                                                                                                                |
| `@beautinique/frontend-components/linear-gradient`  | `LinearGradient`                                                                                                                                                                                                                 |
| `@beautinique/frontend-components/loading-screen`   | `LoadingScreen`, `Teddy`, `WakeUpProgress`, `BEAUTY_FACTS`                                                                                                                                                                       |
| `@beautinique/frontend-components/media`            | `VideoPlayer`, `MediaCarousel`, `MediaCarouselWithParentMedia`, `MediaCarouselWithModal`, `MediaModal`, `captureVideoPoster`, `MEDIA_LABELS`                                                                                     |
| `@beautinique/frontend-components/resend`           | `Resend`                                                                                                                                                                                                                         |
| `@beautinique/frontend-components/static-page`      | `StaticPageLayout`, `StaticPageHeader`, `StaticPageSection`, `InfoCardGrid`, `Checklist`, `HighlightNote`, `NumberedSteps`, `StaticPageCTA`, `EmailUsAction`, `LastUpdatedBadge`                                                 |
| `@beautinique/frontend-components/stepper`          | `Stepper`                                                                                                                                                                                                                        |
| `@beautinique/frontend-components/testimonials`     | `TestimonialCarousel`                                                                                                                                                                                                            |
| `@beautinique/frontend-components/source.css`       | The `@source` line of the setup above                                                                                                                                                                                            |

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

### Inputs (`Input`, `Textarea`, `Checkbox`, `Radio`, `Select`)

```tsx
import { Input, Select } from '@beautinique/frontend-components';

<Input
  label="Name"
  error={errors.name?.message}
  inputProps={{ name: 'name', placeholder: 'Your name' }}
  register={register('name')} // React Hook Form, optional
  icons={{ right: { icon: 'solar:close-circle-linear', label: 'Clear', onClick: clear } }}
/>;

<Select
  label="Fruit"
  options={[
    { label: 'Apple', value: 'apple' },
    { label: 'Banana', value: 'banana', disabled: true },
  ]}
  selectProps={{ value, onChange: setValue, placeholder: 'Pick a fruit' }}
/>;
```

The label sits on the border of the field and is its name (it is tied to the field by its `id`); an `error` is said as
soon as it shows up and marks the field `aria-invalid`. An icon that does something (`onClick`) is drawn inside a
real `<button>` and needs a `label` (the compiler asks for it). `Checkbox` is a `role="switch"`, `Radio` a real radio
group (the arrows move the choice), and `Select` a combobox: the arrow keys, Home, End, Enter, Escape and typing a word
work, the list is drawn in `document.body` (a parent that scrolls does not cut it) and it flips to the other side when
there is no room.

### Layout parts

- `ApiStatus`: the state of a request in the middle of its place: rings while it loads, an icon with a title for `error` (said as an alert), `empty` and `success`.
- `BorderGradient`: a card with a gradient border.
- `Skeleton`: a grey block that pulses where something loads. It is hidden from assistive technology: say "loading" once, on the area (`aria-busy`).
- `Table`, `TableHead`, `TableBody`, `TableRow`, `TableHeadCell`, `TableRowCell`: real `<table>` elements with the look of the apps; they take their attributes (`colSpan`...), and a header cell is `scope="col"` unless told another.
- `ScrollableGradientContainer`: content that scrolls in a box with a fade on the edge that has more behind it; it is a tab stop while it scrolls. `scrollerRef` gives the element that scrolls.
- `LoadingRings`, `LoadingText`, `LoadingPage`: rings and a shining word for a part of a page that loads, and a whole page of them.
- `Dropdown`: a button that opens a panel under it (`aria-expanded`; a closed panel is `inert`, out of reach of the keyboard). `closeOnEscape`, `closeOnOutsideClick`; `children` can be a function that gets `{ close }`.
- `ModalWrapper`: a dialog over the page, drawn in `document.body`: `role="dialog"`, named by its title or `label`, the focus is kept inside and goes back to what had it, the page behind does not scroll, Escape closes the one that is on top.
- `ConfirmModal`: a dialog that asks for a decision (an `alertdialog`) or says how something went; `type="custom"` shows your own content. A press on the backdrop does not close it: a decision is not made by a stray click.
- `NetworkStatusToaster`: says when the connection goes away and when it comes back, with the toaster the app gives (`status` is e.g. `useOnlineStatus().status`).

```tsx
import { ConfirmModal } from '@beautinique/frontend-components';

<ConfirmModal
  type="warning"
  title="Delete this category?"
  description="It cannot be undone."
  buttons={{
    left: { content: 'Cancel' },
    right: { content: 'Delete', buttonProps: { onClick: remove } },
  }}
  modalProps={{ isOpen, onClose: () => setIsOpen(false) }}
/>;
```

### LoadingScreen, Teddy, WakeUpProgress

```tsx
import { LoadingScreen, WakeUpProgress } from '@beautinique/frontend-components/loading-screen';

<LoadingScreen>
  <WakeUpProgress phase="services" services={['user', 'product']} awakeServices={['user']} />
</LoadingScreen>;
```

The screen of the start of an app: the bear (or what you give it) and a fact of beauty under it that changes every 5
seconds (`facts`, `interval`; `BEAUTY_FACTS` is the default list). A screen reader hears `label` once, not each fact.
`WakeUpProgress` shows the steps of a backend that wakes up. `Teddy` imports its css
(`@beautinique/frontend-styles/teddy.css`) itself.

### Media

```tsx
import { MediaCarouselWithModal, VideoPlayer } from '@beautinique/frontend-components/media';

const media = [
  { type: 'image', url: '/a.webp' },
  { type: 'video', url: 'https://cdn.example/clip.mp4' },
];

<MediaCarouselWithModal media={media} />; // thumbnails; one opens a dialog
<VideoPlayer videoProps={{ src: 'https://cdn.example/master.m3u8', controls: true }} />;
```

- `MediaCarousel` is the row of thumbnails: buttons named "Show image 2 of 5", `aria-current` on the chosen one, an optional remove button on each; the row scrolls to the chosen one without moving the page. `MediaCarouselWithParentMedia` shows the chosen item big with previous / next buttons (they go round, the left and right arrow keys do the same, the counter "2 of 5" is read out) and the row under it. `MediaModal` shows the same in a dialog (a video there has controls) and `MediaCarouselWithModal` is the row that opens it.
- `VideoPlayer` plays muted and inline, without controls or a loop, unless told otherwise. A **stream** (`.m3u8`) is played by the browser when it can (Safari, iOS) and by `hls.js` when it cannot: install `hls.js`; it is loaded **only then**, so a page that plays no stream never downloads it. `onStreamError` is told when a stream cannot be played; nothing is logged. `showPosterOnly` shows only the poster, which is made from the file in the browser (`captureVideoPoster`) unless you give `videoProps.poster` or `getPoster` (e.g. a poster that a CDN makes).
- Every word said to assistive technology is in `labels` (`MEDIA_LABELS` has the English ones), e.g. `labels={{ next: 'Siguiente' }}`.

### TestimonialCarousel

```tsx
import { TestimonialCarousel } from '@beautinique/frontend-components/testimonials';

<TestimonialCarousel
  testimonials={[{ name: 'Asha Rao', role: 'Founder', content: 'Lovely products.', rating: 5 }]}
  interval={5000}
/>;
```

One testimonial at a time, turning by itself the way a carousel that moves has to: it stops while the pointer is over it
(a mouse, not a finger) or the focus is in it, a pause / play button stops it for good, and with the system setting for
less motion it does not turn at all. Previous and next buttons go round. What is announced is the current slide, and only
while it is not turning. Without an `image` the initials of the name are shown.

### HierarchySelect

```tsx
import { HierarchySelect } from '@beautinique/frontend-components/hierarchy-select';

<HierarchySelect
  label="Category"
  options={[
    { label: 'Skin care', value: 'skin', children: [{ label: 'Cleanser', value: 'cleanser' }] },
  ]}
  selectProps={{ value, onChange: setValue, placeholder: 'Choose a category' }}
/>;
```

A field that opens a tree of options with a search field above it. Only an option without children is chosen; the others
open and close. The focus stays in the search field while the arrow keys move through the tree (Right and Left open and
close a branch, Enter chooses, Escape closes and gives the focus back, Tab closes). A search shows the matches and the
branches that lead to them, all open. Give `inputProps={{ value, onChange }}` to own the search (to search on a server).

### ColorInput

```tsx
import { ColorInput } from '@beautinique/frontend-components/color-input';

<ColorInput label="Brand colour" value={hex} onChange={setHex} />;
```

Needs `react-color-palette`. The field is one button that opens a picker (a dialog that holds the focus until it is closed
and gives it back). `value` and what `onChange` gets are hex strings; text that is no colour is not passed on. The
sliders need a mouse or a finger; the hex and rgb fields in the picker work from the keyboard.

### FileInput

```tsx
import { FileInput } from '@beautinique/frontend-components/file-input';

<FileInput
  label="Photos"
  fileInputProps={{ name: 'photos', multiple: true, value: files, onChange: addFiles }}
  errors={files.map((file) => (file.size > MAX ? 'Too big' : undefined))}
  handleRemove={removeFile}
/>;
```

A real file input (the keyboard reaches it, the field shows the focus, the same file can be chosen again) with a thumbnail
under it for each file in `value` (a `File`, or the address of one that is already saved). A thumbnail opens the file big
in a dialog and can have a remove button; `errors` gives a message per file and a red border to its thumbnail. The files
get a browser address (`URL.createObjectURL`) that is given back when the file goes. `getMediaType` says what is a picture
and what a video (the default looks at the type and at the ending).

### Breadcrumb

```tsx
import { Breadcrumb, getBreadcrumbItems } from '@beautinique/frontend-components/breadcrumb';

<Breadcrumb items={getBreadcrumbItems(pathname)} onNavigate={(href) => navigate(href)} />;
```

A `nav` with a list; the last item is the current page. The links are plain `<a href>` (they work in a new tab);
`onNavigate` is called for a plain click (not for a click with a modifier, or a middle click) so the app can go there with
its router. `getBreadcrumbItems('/products/skin-care')` makes the items from a path.

### SocialAuth

```tsx
import { SocialAuth } from '@beautinique/frontend-components/auth';

<SocialAuth
  providers={[{ name: 'Google', icon: 'logos:google-icon', href: '/auth/google' }]}
  onProviderClick={() => sessionStorage.setItem('redirect', location.pathname)}
/>;
```

Icons that are links ("Continue with Google"). `onProviderClick` runs before the browser leaves for the provider. An icon
given by name comes from the Iconify API unless the app has it registered (`addIcon`).

### Static page parts

`StaticPageLayout`, `StaticPageHeader` (the page `h1`), `StaticPageSection` (an `h2`), `InfoCardGrid` (`h3` cards),
`Checklist`, `HighlightNote` (a `note`), `NumberedSteps` (an ordered list), `StaticPageCTA`, `EmailUsAction` and
`LastUpdatedBadge` (`date` is required; it is written in UTC and in a fixed language, so a server and a browser agree)
make the pages that are only content (company, legal, information). The icons are given by name.

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

- **The package holds no state.** The toast store is made by the app (`createToastStore` of `@beautinique/frontend-stores`, with this package's `TToast`) and given in, to the `ToastContainer` as a prop. The toaster is the stores package's too (`createToaster`). Nothing here makes a store or a toaster, or exports one, so the package can never be the cause of two stores. The root only re-exports `/ui`, `/layout`, `/inputs`, `/theme` and `/toast` (`tsup.config.ts` keeps them external, and `built-files.test.ts` checks the built files after `npm run build`).
- **The root has what most screens use** (`/ui`, `/layout`, `/inputs`, `/theme` and `/toast`). A component that
  few screens use gets a path of its own and is not in the root.
- **Icons are Iconify icons, bundled and registered.** A component draws its icons with Iconify's
  `Icon`, and the icon data is in the package (`toast-icons.ts`, `stepper-icons.ts`,
  `theme-icons.ts`, `inputs-icons.ts`, `media-icons.ts`..., registered with `addCollection`), so they show without a network and without
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
- **One entry imports another only through its `index`** (`../ui/index.js`, never `../ui/Button.js`): the build leaves such an import as an import of the public path, so a component is never bundled twice (`entries.test.ts` checks it).
- **Heavy or rare dependencies are optional peers, loaded when they are needed**: `hls.js` is `import()`ed when a stream is played, and `react-color-palette` is only imported by `/color-input`.
- **Words are props.** Every sentence a component says to assistive technology has a default in English and a prop (`labels`) to change it.

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
