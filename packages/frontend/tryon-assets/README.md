# @beautinique/frontend-tryon-assets

The models and images the Beautinique try-on needs, in a package of their own (about 17 MB) so that
they are not part of the code package (`@beautinique/frontend-tryon`), which changes far more often.
No code is in here.

[`@beautinique/frontend-tryon`](../tryon/README.md) loads them from a CDN (jsDelivr serves every npm
package) by default, so an app does not need to install or copy anything. You only install this
package to **host the files yourself**.

## What is inside

| Folder                            | What                                                    | Used by                  |
| --------------------------------- | ------------------------------------------------------- | ------------------------ |
| `models/face_landmarker.task`     | Face landmarks (3.6 MB)                                 | lip, face and eye try-on |
| `models/hand_landmarker.task`     | Hand landmarks (7.5 MB)                                 | nail try-on              |
| `models/hair_segmenter.tflite`    | Hair segmentation (0.8 MB)                              | hair try-on              |
| `images/models/{face,hair,hand}/` | The sample models of the "Choose a model" list (6 each) | the model list           |
| `images/eye/<finish>/`            | The previews of the eye patterns                        | the pattern picker       |
| `images/lips/textures/`           | The textures the lip finishes are drawn with            | lip try-on               |

## How the code package finds them

By default `https://cdn.jsdelivr.net/npm/@beautinique/frontend-tryon-assets@<version>/`, with the
exact version the code package was tested with (the version is in a constant, and a test of the
monorepo fails if it is not the version of this package). The files never change inside a version,
so the CDN serves them with a cache of one year (`immutable`).

To serve them from your own origin instead, copy the folders to a folder of your public files and give
the try-on the address:

```tsx
<TryOnModal assets={{ baseUrl: '/tryon-assets/' }} ... />
```

If they are somewhere that is not a plain folder (a bucket with hashed names, a bundler that renames
assets), give a function that turns the path inside this package (`models/face_landmarker.task`,
`images/eye/...`) into the address:

```tsx
<TryOnModal assets={{ resolve: (path) => myCdn(path) }} ... />
```

Whatever the address, the server has to allow the origin of your app (`Access-Control-Allow-Origin`):
the models are fetched, and the images are drawn on a canvas that the try-on reads back (for the
snapshot). jsDelivr does; a static host of your own does when it serves the files from your own
origin.

## Changing a file

A file of a published version must not change (the CDN keeps it for a year). Put the new file in a new
version of this package, and raise the version in the code package.

## License

MIT for the images (see `NOTICE.md`); the models are Google's, under Apache 2.0.
