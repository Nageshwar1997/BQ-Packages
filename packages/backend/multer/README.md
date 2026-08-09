# @beautinique/backend-multer

A validated file-upload middleware for Express, built on top of [`multer`](https://www.npmjs.com/package/multer) - handles the upload, then checks Multer's own errors plus MIME type and size limits, reporting everything as a single structured error.

## Installation

```bash
npm install @beautinique/backend-multer
```

`express` is a peer dependency - install whichever version your service already uses.

## Usage

```ts
import { validateMulter } from '@beautinique/backend-multer';

app.post(
  '/products/:id/image',
  validateMulter({ type: 'single', fieldName: 'image' }),
  tryCatch(async (req, res) => {
    // req.file is validated - correct MIME type, within the size limit
    res.success({ data: req.file });
  }),
);
```

| Option        | Default                          | Description                                                                                       |
| ------------- | ----------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `type`        | _(required)_                        | The Multer upload mode: `'single'`, `'array'`, `'fields'`, `'any'`, or `'none'`.                     |
| `fieldName`   | -                                    | Required when `type` is `'single'` or `'array'` - the form field to read files from.                |
| `maxCount`    | Multer's default (`Infinity`)       | Only used with `type: 'array'` - the max number of files accepted for `fieldName`.                  |
| `fieldsConfig`| -                                    | Required when `type` is `'fields'` - `{ name, maxCount }[]`, one entry per form field.               |
| `limits`      | Multer's own defaults               | Passed straight through to `multer({ limits })` (e.g. `fileSize` as a hard byte ceiling).            |
| `format`      | Beautinique's image/video allowlist | Overrides the allowed MIME types per media kind: `{ IMAGE?, VIDEO?, OTHER? }` (each an array of MIME strings). `OTHER` defaults to none allowed. |
| `size`        | Beautinique's image/video defaults  | Overrides the max size per media kind, in bytes: `{ IMAGE?, VIDEO?, OTHER? }`. `OTHER` defaults to 2 MB. |

Uploads always use `multer`'s `memoryStorage()` - files are available as buffers on `req.file`/`req.files`, never written to disk.

Validation runs in two stages, and the first one that fails wins:

1. **Multer's own errors** - e.g. `LIMIT_FILE_SIZE`, `LIMIT_UNEXPECTED_FILE`, `LIMIT_FILE_COUNT` - mapped to field/global messages with the appropriate error code (`PAYLOAD_TOO_LARGE`, `BAD_REQUEST`, ...).
2. **MIME type and size validation** - every uploaded file (as determined by `type`) is checked against the resolved `format`/`size` allowlist, using Beautinique's own `@beautinique/shared-constants` image/video defaults unless overridden.

Either stage can report multiple field/global errors at once (via `@beautinique/backend-classes`'s `ErrorBuilder`) before calling `next(error)` once, so a single response can list every problem with the request instead of failing on just the first one found.

## Repository

https://github.com/Nageshwar1997/BQ-Packages

## Homepage

https://github.com/Nageshwar1997/BQ-Packages

## Issues

https://github.com/Nageshwar1997/BQ-Packages/issues

## Author

Nageshwar Pawar

## License

This package is licensed under the MIT License. See the root `LICENSE` file for details.
