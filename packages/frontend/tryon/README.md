# @beautinique/frontend-tryon

The virtual try-on of the Beautinique frontends: lips, face, eyes, hair and nails, on a **live camera**
or on a **photo** (uploaded, or one of the sample models). It is one modal, `TryOnModal`, with the
engines (MediaPipe) behind it.

- For a **shopper** the category and the subcategory are fixed: they are what the product has.
- For whoever **sets up a product** (Admin, Seller, Master) the modal can be `selectable`: the category and
  the subcategory can be changed while it is open, to see which one fits, and are given back with
  **Apply** (**Cancel**, the cross, Escape and a press on the backdrop change nothing).

The modal knows no roles and no routes: the app decides who gets which, and where the modal opens.

## Installation

```bash
npm install @beautinique/frontend-tryon @beautinique/frontend-components @beautinique/frontend-styles @iconify/react
```

Peer dependencies: `react`, `react-dom`, `@iconify/react`, `@beautinique/frontend-styles` and
[`@beautinique/frontend-components`](../components/README.md) (the modal is made of its `ModalWrapper`,
`Select`, `Button` and so on, so its own setup is needed too). `vite` is an **optional** peer, for
[`/vite`](#setup-once-per-app) only.

`@mediapipe/tasks-vision` is a dependency, pinned to **one exact version** (see
[Known limits](#known-limits)): the app does not install it.

## Setup (once per app)

**1. The styles.** In the app's own `index.css`, after the ones of the components:

```css
@import '@beautinique/frontend-styles';
@import '@beautinique/frontend-components/source.css';
@import '@beautinique/frontend-tryon/source.css';
@import './app.css';
```

`source.css` is not optional. Tailwind v4 does not look for class names inside `node_modules`, so without
it the classes of the modal are never generated and it comes out unstyled.

**2. The Vite plugin** (Vite apps):

```ts
// vite.config.ts
import { tryOnVitePlugin } from '@beautinique/frontend-tryon/vite';

export default defineConfig({ plugins: [react(), tailwindcss(), tryOnVitePlugin()] });
```

It keeps `@mediapipe/tasks-vision` out of Vite's pre-bundling (it loads its own WebAssembly runtime, which
the pre-bundler breaks at development time) and corrects a wrong source map comment in that package, which
made the dev server log "Failed to load source map". Without it the try-on can fail to start in `vite dev`.
Only Vite has been tried.

**3. The models and the images.** Nothing to do: they come from a CDN by default, see [Assets](#assets).

The camera needs a secure context: HTTPS, or `localhost`.

## Use

### A shopper

```tsx
import { TryOnModal } from '@beautinique/frontend-tryon';

<TryOnModal
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  tryOn={product.tryOn} // { category: 'LIP', subCategory: 'MATTE' }
  shades={colorVariants} // [{ name: 'Rose', hexColor: '#C2185B' }]
  onUploadError={(error) => toast.error(error.title, error.description)} // optional
/>;
```

### Whoever sets up a product (`selectable`)

```tsx
<TryOnModal
  selectable
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  tryOn={form.tryOn} // where it starts; may be undefined for a product that has none yet
  shades={form.colorVariants} // may be [] for a product that has none yet
  onApply={(selection) => form.setTryOn(selection)} // { category, subCategory }
/>
```

- **Apply** calls `onApply(selection)` and then `onClose()`. Every other way of closing calls only
  `onClose()`: what was chosen is let go of, and the next time the modal opens it starts again from `tryOn`.
- Choosing another category chooses the first subcategory of it, so a selection is always complete.
- The shade that is on is **carried** to the new category (the same shade on another makeup); the intensity
  and the pattern are not (they mean something only for the subcategory they were set for).
- The mode is kept: a modal that is live stays live; a photo stays the photo.
- A product that has no colour variants yet is tried with the **curated shades of the chosen subcategory**.
  The shopper's modal never does this: a shopper is shown what the product really has.

## Props

| Prop            | Type                                   | Default | What                                                                                                                                            |
| --------------- | -------------------------------------- | ------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `isOpen`        | `boolean`                              | -       | Whether the modal is open.                                                                                                                      |
| `onClose`       | `() => void`                           | -       | Called when the modal asks to be closed (the cross, Escape, the backdrop, and Cancel / Apply of a selectable modal).                            |
| `tryOn`         | `TTryOnSelection`                      | -       | The category and the subcategory (`product.tryOn`). Fixed for a shopper; where a `selectable` modal starts.                                     |
| `shades`        | `IShade[]`                             | -       | The shades to try: the real colour variants of the product. Never invented with a colour picker.                                                |
| `assets`        | `ITryOnAssets`                         | CDN     | Where the models and the images are, see [Assets](#assets).                                                                                     |
| `onUploadError` | `(error: ITryOnError) => void`         | -       | Called with a photo that was turned down (too big, not an image). Without it the modal shows the reason where the photo is chosen, as an alert. |
| `selectable`    | `boolean`                              | `false` | The category and the subcategory can be changed while the modal is open.                                                                        |
| `onApply`       | `(selection: TTryOnSelection) => void` | -       | `selectable` only: called with the selection when **Apply** is pressed, just before `onClose`.                                                  |

## Assets

The code and the data are two packages: this one, and
[`@beautinique/frontend-tryon-assets`](../tryon-assets/README.md) (the three models and the images, about
17 MB). The assets change far less than the code, and are not part of your bundle.

By default they are fetched from jsDelivr, from the exact version of the assets package this version of the
code was tested with, and the WebAssembly runtime of MediaPipe from the same version of
`@mediapipe/tasks-vision` that this package depends on. To serve them yourself:

```tsx
<TryOnModal assets={{ baseUrl: '/tryon-assets/' }} />            // a folder of your public files
<TryOnModal assets={{ resolve: (path) => cdn(path) }} />          // full control, path like 'models/face_landmarker.task'
<TryOnModal assets={{ wasmBaseUrl: '/mediapipe/wasm' }} />        // the WebAssembly runtime
```

| Field         | What                                                                                                 |
| ------------- | ---------------------------------------------------------------------------------------------------- |
| `baseUrl`     | Folder with the contents of the assets package (`models/...`, `images/...`).                         |
| `resolve`     | `(path) => url`. Wins over `baseUrl`. `path` is relative to the assets package, e.g. `images/eye/…`. |
| `wasmBaseUrl` | Folder with the `.wasm` files of `@mediapipe/tasks-vision`.                                          |

The server of the files has to allow the origin of the app (`Access-Control-Allow-Origin`): the models are
fetched, and the images are drawn on a canvas that the try-on reads back (for the snapshot). jsDelivr does.

## Import paths

| Import path                              | What it gives                                                                                                                                                                                |
| ---------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@beautinique/frontend-tryon`            | `TryOnModal` (loads its engines the first time it is opened, with a loading dialog meanwhile that is the same size as the modal), the constants, and the types. The light entry; start here. |
| `@beautinique/frontend-tryon/constants`  | Only the data: categories and their titles, modes, curated shades, the instructions, and `resolveTryOnAssetUrl`. **No React and no MediaPipe**, for a form that needs only these.            |
| `@beautinique/frontend-tryon/modal`      | The same `TryOnModal`, with the engines in your bundle at once (no `import()`), for whoever wants it eager.                                                                                  |
| `@beautinique/frontend-tryon/vite`       | `tryOnVitePlugin`.                                                                                                                                                                           |
| `@beautinique/frontend-tryon/source.css` | The line that tells Tailwind where the class names are.                                                                                                                                      |

The root costs the page nothing until the modal is opened: MediaPipe is not in it, and `TryOnModal` of the
root renders nothing (and loads nothing) while `isOpen` is `false`. Once opened it stays mounted, so what it
keeps (the loaded models, the camera permission) is not lost.

## Accessibility

- The modal is a dialog named "Try-On" (`role="dialog"`, `aria-modal`), with the focus kept inside it, Escape
  to close, and the page behind it not scrollable. The loading dialog that shows while the engines load is a
  dialog too, and can be closed.
- The category and the subcategory are real select fields, in a labelled group. The compare slider is a
  slider (`role="slider"`) that the arrow keys, Page Up / Down, Home and End move (Shift for bigger steps).
- A rejected photo is announced (`role="alert"`) where it was chosen.
- The overlay over the picture is announced: `role="status"` while the camera or the photo is getting ready
  and when the face is not in frame, `role="alert"` when something went wrong.

## Known limits

- **Live camera in the selectable modal:** choosing another category or subcategory makes a new engine, so the
  camera restarts for a moment (the browser keeps its permission).
- **English only.** The texts are in the package, not given by props.
- **One MediaPipe version.** `@mediapipe/tasks-vision` is pinned to `1.0.1` and its WebAssembly runtime to
  the same `1.0.1` (the two must be the same; a test fails if they are not). To move to another, change both
  constants (`MEDIAPIPE_TASKS_VISION_VERSION`) and the dependency, and try every category.
- **The nail try-on is an approximation.** There is no ready-made nail model: it is found from the hand
  landmarks, so very different nail shapes and lengths are an honest ceiling.
- **Vite only** for the plugin. Other bundlers have not been tried.

The design notes of each category (why an engine is made the way it is, and what was tried) are with the
app they were written in: `BQ-Client/docs/tryons/` (`LIP`, `FACE`, `EYE`, `HAIR`, `NAIL`).

## Development

```bash
npm run playground -w @beautinique/frontend-tryon   # http://localhost:4202
npm run test -w @beautinique/frontend-tryon
npm run lint -w @beautinique/frontend-tryon
npm run typecheck -w @beautinique/frontend-tryon
npm run build -w @beautinique/frontend-tryon
```

The playground opens the modal for a shopper and for a product being set up, with the assets of the
monorepo (not the CDN). The tests replace the five stages with a stand-in that tells its state, so what the
modal does around an engine (the steps, the selection, the shades, Apply and Cancel) is real; the engines
themselves are tested on real pixels with `node-canvas`.

**Publishing:** the order is `components` (the modal needs its fixes), then `tryon-assets`, then `tryon`.
The assets are fetched by version, so a new version of the assets package is raised in
`TRYON_ASSETS_VERSION` (a test of the monorepo fails if they differ).

## License

MIT
