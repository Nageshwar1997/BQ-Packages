# @beautinique/frontend-quill

The **rich-text editor** and the **safe viewer** of the Beautinique frontends.

- `QuillContent` shows the HTML the editor saved (a product description, how to use it, the ingredients), after
  cleaning it, with the look of the shop. It never imports `quill`.
- `QuillEditor` is [Quill](https://quilljs.com/) with the toolbar of the shop. An image that is picked **stays on the
  device** (shown from a `blob:` address) until the content is saved, and `processQuillContent` uploads the images
  and puts their addresses in the HTML.

The editor is only the box with the toolbar and the text. A label, a message about an error, a form library and the
upload request itself are the page's: they come in through props and functions, so the editor knows no app, no
router and no store.

## Installation

```bash
npm install @beautinique/frontend-quill @beautinique/frontend-styles quill
```

An app that only **shows** saved content does not need `quill`:

```bash
npm install @beautinique/frontend-quill @beautinique/frontend-styles
```

Peer dependencies: `react`, `@beautinique/frontend-styles`, and `quill` (`^2.0.3`, **optional**: only
`/editor` needs it). DOMPurify, `nanoid`, `@beautinique/frontend-constants` and `@beautinique/shared-utils` are
dependencies: the app does not install them.

## Setup (once per app)

**1. The styles.** In the app's own `index.css`, after the styles package:

```css
@import '@beautinique/frontend-styles';
@import '@beautinique/frontend-quill/source.css';
@import './app.css';
```

`source.css` is not optional. Tailwind v4 does not look for class names inside `node_modules`, so without it the
classes of the viewer (`prose …`) and of the editor box are never generated and they come out unstyled.

**2. The editor's css** (only where the editor is used). Import it **from JavaScript**, next to the page that
uses the editor, as the apps always have:

```ts
import '@beautinique/frontend-styles/quill-input.css';
```

It brings Quill's own stylesheet with it. Do **not** `@import` it from the css of the app: through Tailwind's
`@import` the line that loads Quill's stylesheet is dropped and the toolbar collapses.

## The viewer

```tsx
import { QuillContent } from '@beautinique/frontend-quill';

<QuillContent content={product.description} />
<QuillContent content={product.description} className="lg:prose-sm!" id="description" />
```

- The HTML is **cleaned right before it is written into the page**, every time it changes (see
  [Security](#security)), also when it was saved clean.
- It is written after the first render, so a page that is rendered on a server and then hydrated has nothing to
  explain; on the server the box is rendered empty.
- Setting `content` to an empty string empties the box (the old content does not stay).
- It takes the attributes of a `div` (`className` is added to the look of the shop, `id`, `aria-*`, `data-*`, …).

`sanitizeQuillHtml(html)` is the same cleaning, for a page that needs the string.

## The editor

```tsx
import '@beautinique/frontend-styles/quill-input.css';

import {
  describeQuillEditorError,
  processQuillContent,
  QuillEditor,
  type QuillImageRef,
  QuillUploadCountError,
} from '@beautinique/frontend-quill/editor';
import type Quill from 'quill';
import { useRef, useState } from 'react';

export const DescriptionField = () => {
  const quillRef = useRef<Quill | null>(null);
  const imagesRef = useRef<QuillImageRef[]>([]);
  const [html, setHtml] = useState('');

  const save = async () => {
    if (!quillRef.current) return;

    try {
      const content = await processQuillContent({
        quill: quillRef.current,
        imagesRef,
        upload: (files) => uploadToTheCloud(files, 'products'), // gives one address for each file
      });

      await saveProduct({ description: content }); // `undefined` when the text is empty
    } catch (error) {
      if (error instanceof QuillUploadCountError) toast('Some files could not be uploaded.');
      else throw error;
    }
  };

  return (
    <>
      <span id="description-label">Description</span>
      <QuillEditor
        ref={quillRef}
        imagesRef={imagesRef}
        value={html}
        onChange={setHtml}
        onError={(error) => toast.error(describeQuillEditorError(error))}
        aria-labelledby="description-label"
      />
      <button type="button" onClick={() => void save()}>
        Save
      </button>
    </>
  );
};
```

With react-hook-form, `value` and `onChange` come from the `field` of a `Controller`; a message about an error goes
in `aria-describedby`, and `aria-invalid` tells assistive technology the content is not valid.

### `QuillEditor` props

| Prop                                                                   | Default                           | What it does                                                                                                                                     |
| ---------------------------------------------------------------------- | --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `value`                                                                |                                   | The HTML to show. Cleaned before it lands in the editor. A value that is only what the editor just reported is ignored (the cursor stays put).   |
| `onChange(html)`                                                       |                                   | The HTML after every change a person makes. The function of the **last render** is the one called.                                               |
| `placeholder`                                                          | `Write your content here...`      | Shown while empty. Can change.                                                                                                                   |
| `disabled`                                                             | `false`                           | Not editable. Can change.                                                                                                                        |
| `className`                                                            |                                   | Added to the box around the toolbar and the text.                                                                                                |
| `imagesRef`                                                            |                                   | Where the picked images are held until `processQuillContent`. **Without it the image button is left out** (the editor could not hold the image). |
| `onError(error)`                                                       |                                   | Something was not allowed (see below). The editor shows nothing itself.                                                                          |
| `toolbar`                                                              | `DEFAULT_QUILL_TOOLBAR`           | Quill's toolbar format. Read once.                                                                                                               |
| `linkIdButton`                                                         | `true`                            | The button that gives the selected link the `id` `custom-link-btn` (and takes it off). Read once.                                                |
| `headingIds`                                                           | `true`                            | Gives every heading an `id` a moment after a change (so a page can link to it). Can change.                                                      |
| `allowedImageHosts`                                                    | `['res.cloudinary.com']`          | Hosts an image may come from, other than this device.                                                                                            |
| `maxImageSize` / `imageMimes` / `imageFormats`                         | `@beautinique/frontend-constants` | What a picked image may be (bytes; MIME types; extensions).                                                                                      |
| `aria-label` / `aria-labelledby` / `aria-describedby` / `aria-invalid` |                                   | On the text box. Can change.                                                                                                                     |

"Read once" means: Quill is made when the editor appears. To change those, give the editor another `key`. The `ref`
gives the Quill instance (`null` before it is made and after it is gone), also under StrictMode.

### What the editor does

- **The image button** opens the file picker. The picked image goes in at the cursor (at the end if there is none),
  shown from a `blob:` address, and its file is held in `imagesRef`. Too big, or not an allowed type: `onError`, and
  nothing is inserted. An image deleted from the text **stays held**, so an undo brings it back working (its `blob:`
  is still alive); the held images are let go of when the content is saved, or when the editor goes away.
- **Images that were not picked with the button** are not allowed: one dragged, dropped or pasted in from another
  site, or one with a `data:` address, is taken out again and `onError({ type: 'image-not-allowed' })` is called. An
  image from an allowed host and one from this device stay (so an undo can bring a saved image back). A pasted image is
  dropped when pasting, and a pasted text loses its colours.
- **A value the page sets** (a saved draft, a form that was reset) is not a change: it is not reported with `onChange`
  and is not checked as if a person had added it.
- **Under StrictMode** the effects run twice and there is still one editor and one toolbar.

### `onError` and `describeQuillEditorError`

`QuillEditorError` is one of `image-too-large` (`file`, `size`, `maxSize`), `image-invalid-type` (`file`, `extension`,
`allowedFormats`) and `image-not-allowed`. `describeQuillEditorError(error)` gives `{ title, description }` for a toast.

### `processQuillContent({ quill, imagesRef, upload })`

Makes the content ready to be saved:

1. If no held image is in the text, it gives back the cleaned HTML (`undefined` if the text is empty) and does not call
   `upload` (nothing is freed: a deleted image can still come back with an undo).
2. Otherwise `upload(files)` is called **once**, with the files of the held images **that are in the text now** (an
   image that was deleted from it is not uploaded), in the order they were picked, and must give one address for each,
   in the same order.
3. The addresses replace the `blob:` addresses in the editor, every held blob is freed (also those of deleted images),
   the list is emptied (in place, so the ref stays valid), the undo history is cleared (an undo must not bring back
   the text with the old `blob:` addresses) and the cleaned HTML is given back.

If the upload fails, or gives a different number of addresses (`QuillUploadCountError`), **nothing is changed**: the
images are still in the editor and the call can be repeated.

### Other values of `/editor`

`getQuillContent(html)` (clean, and `undefined` for an empty text), `getQuillImageFiles(images)` (the files of a list
of held images), `getQuillImagesInText(quill, images)` (the held images that are in the text now: use it to count what a
save will upload),
`DEFAULT_QUILL_TOOLBAR`, `DEFAULT_ALLOWED_IMAGE_HOSTS`, `DEFAULT_QUILL_LINK_ID`, `DEFAULT_QUILL_PLACEHOLDER`, and the
types `QuillEditorProps`, `QuillEditorError`, `QuillImageRef`, `QuillToolbar` and `ProcessQuillContentOptions`.

## Import paths

| Import path                              | What it gives                                                                                                             |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `@beautinique/frontend-quill`            | `QuillContent`, `sanitizeQuillHtml`. **Never imports `quill`** (a test reads the source and the built files to check it). |
| `@beautinique/frontend-quill/editor`     | `QuillEditor`, `processQuillContent` and what goes with them. Needs `quill` and a browser.                                |
| `@beautinique/frontend-quill/source.css` | The line that tells Tailwind where the class names are.                                                                   |

## Security

The HTML is typed by someone else (a seller's description reaches every shopper), so it is cleaned with DOMPurify
**when it is shown, when it is loaded into the editor, and when it is saved** (`processQuillContent`), whatever
Quill does and whatever was stored. Quill itself has a known gap in its HTML export (GHSA-v3m3-f69x-jf25).

- Scripts, event handlers (`onerror=…`), `javascript:` addresses and similar are taken out.
- **Form controls** (`form`, `input`, `button`, `textarea`, `select`) are taken out: the editor never writes them, and
  a form in a description is how a page is used against its shoppers.
- A link that opens a new tab gets `rel="noopener noreferrer"`, also when the saved value came without it.
- The video `<iframe>` of the toolbar stays; its `src` is cleaned like any address.
- **Where nothing can be cleaned** (a server, or a test without a DOM) `sanitizeQuillHtml` gives back an empty string,
  never the HTML it was given. (DOMPurify itself hands the HTML back untouched there.)
- The package uses its own DOMPurify instance, so its rules do not change what the DOMPurify of the app does.

## Accessibility

- The text box is a multi-line `textbox` (`role`, `aria-multiline`) with the name and the description the page gives
  it, `aria-invalid`, and `aria-readonly` while `disabled`.
- The toolbar is a `toolbar` named "Text formatting", and every button has a name (Quill's, and the one this package
  adds: "Toggle the id of the link").
- The buttons of the toolbar do not take the cursor out of the text when pressed.

## Known limits

- **A browser is needed for the editor.** Quill touches `document` when it loads: on a server render the editor only
  on the client (`/editor` cannot be imported in Node; the viewer can).
- **The editor is made once** (`toolbar`, `linkIdButton` and the presence of `imagesRef` are read then): use `key` to
  change them.
- **The video `<iframe>` can point at any `https` address.** A list of allowed hosts is the next thing to add.
- **English only.** The texts (toolbar labels, `describeQuillEditorError`) are in the package.

## Development

```bash
npm run playground -w @beautinique/frontend-quill   # http://localhost:4203 (needs `npm run build` first)
npm run test -w @beautinique/frontend-quill
npm run lint -w @beautinique/frontend-quill
npm run typecheck -w @beautinique/frontend-quill
npm run build -w @beautinique/frontend-quill
```

The playground is a page that uses the package the way an app does, through `dist`: the editor with every prop
changeable, a fake upload that can fail or give too few addresses, the saved content shown with the viewer, and a
box where bad HTML shows what the viewer does with it.

The tests run Quill for real in jsdom (typing, formats, the toolbar, the clipboard matchers, history). Two things
only a browser shows were checked there: the layout of the toolbar, and a file dropped on the text.

## License

MIT
