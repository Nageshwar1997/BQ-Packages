# @beautinique/backend-request

Reusable Express request-guard middleware for Beautinique backend services - reject malformed requests and restrict service-to-service access before they ever reach a route handler.

## Installation

```bash
npm install @beautinique/backend-request
```

`express` is a peer dependency - install whichever version your service already uses.

## `checkEmptyRequest`

Rejects requests that are missing required parts (body, file(s), params, query) with a `ValidationError`, before the route handler runs.

```ts
import { checkEmptyRequest } from '@beautinique/backend-request';

app.post('/products', checkEmptyRequest({ body: true }), createProduct);
app.post('/products/:id/image', checkEmptyRequest({ file: true }), uploadImage);
```

Every flag is opt-in (all default to not required), so `checkEmptyRequest({})` allows any request through unchanged. When multiple flags are combined, checks run in this order and the first violation wins:

| Option        | Requires                                                      |
| ------------- | --------------------------------------------------------------- |
| `filesOrBody` | `req.body` or `req.files` (plural) non-empty                   |
| `fileOrBody`  | `req.body` or `req.file` (single) non-empty                    |
| `body`        | `req.body` non-empty                                            |
| `files`       | `req.files` (plural) non-empty                                  |
| `file`        | `req.file` (single) non-empty                                   |
| `params`      | `req.params` non-empty                                          |
| `query`       | `req.query` non-empty                                           |

## `serviceAccess`

Restricts access to trusted internal callers via a shared secret header - e.g. an internal gateway calling a downstream microservice directly. Rejects with `AuthorizationError` when the header is missing or doesn't match.

```ts
import { serviceAccess } from '@beautinique/backend-request';

app.use(serviceAccess({ secret: process.env.SERVICE_SECRET! }));
```

| Option       | Default              | Description                                                   |
| ------------ | --------------------- | ----------------------------------------------------------------- |
| `secret`     | _(required)_           | Validated once at setup time - throws `InternalServerError` if missing/blank. |
| `headerName` | `X-Service-Secret`    | The header the caller must send the secret in.                |

The secret comparison hashes both sides and uses `timingSafeEqual`, so a mismatch can't be inferred from response timing, and secrets of different lengths never throw.

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
