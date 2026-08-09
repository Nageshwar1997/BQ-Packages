# @beautinique/backend-zod

Backend Zod schemas and an Express request-validation middleware for Beautinique services.

## Installation

```bash
npm install @beautinique/backend-zod
```

`express` is a peer dependency - only required for `validateZod`. Install whichever version your service already uses.

## `validateZod`

Validates one or more parts of a request - `headers`, `params`, `query`, `body`, `file`, `files` - against Zod schemas, all in a single middleware. Every part is independently optional, so a route only passes the schemas it actually needs:

```ts
import { z } from '@beautinique/shared-zod';
import { validateZod } from '@beautinique/backend-zod';

app.get(
  '/products',
  validateZod({
    query: z.object({
      page: z.coerce.number().int().min(1).default(1),
      limit: z.coerce.number().int().min(1).max(100).default(20),
    }),
  }),
  tryCatch(async (req, res) => {
    // req.query.page / req.query.limit are numbers here, not strings
    res.success({ data: await productService.list(req.query) });
  }),
);

app.post(
  '/products/:id/image',
  validateMulter({ type: 'single', fieldName: 'image' }),
  validateZod({
    params: z.object({ id: z.string().uuid() }),
    file: z.object({ mimetype: z.enum(['image/png', 'image/jpeg']), size: z.number().max(2 * 1024 * 1024) }),
  }),
  tryCatch(async (req, res) => { /* ... */ }),
);
```

- **Every provided schema is checked before failing** - a request with a bad `query` *and* a bad `body` reports both at once, not just the first one found.
- **On success**, `req[target]` is overwritten with Zod's *parsed* value for every target that was validated - so coercions, transforms, and defaults on the schema (like `z.coerce.number()` above) are what the route handler actually sees, not the raw input.
- **On failure**, a single `ValidationError` (422 `VALIDATION_ERROR`) is passed to `next(error)`, built via `@beautinique/backend-classes`'s `ErrorBuilder` - one field entry per failed Zod issue, prefixed with its target (e.g. `query.page`, `body.email`), so it flows through `errorResponse` from `@beautinique/backend-response` the same way as everywhere else.
- **`file`/`files`** read `req.file`/`req.files` (as populated by [`@beautinique/backend-multer`](https://www.npmjs.com/package/@beautinique/backend-multer), or `multer` directly) without depending on `@types/multer`'s ambient types - pass whatever shape you expect, e.g. mirroring `TFile` from `@beautinique/backend-multer`.

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
