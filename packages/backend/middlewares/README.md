# @beautinique/backend-middlewares

Reusable Express middlewares for Beautinique backend services.

## Installation

```bash
npm install @beautinique/backend-middlewares
```

`cors` is an **optional** peer dependency - only install it in services that actually use `corsMiddleware`:

```bash
npm install cors
```

`checkEmptyRequest`/`serviceAccess` never touch `cors` at all, and importing this package never requires `cors` to be installed - it's only resolved the moment `corsMiddleware(...)` is actually called. Calling it without `cors` installed throws a clear `ConfigurationError` telling you to install it, instead of a cryptic module-not-found error.

## `corsMiddleware`

A thin, production-ready wrapper around the [`cors`](https://www.npmjs.com/package/cors) package. Every option is `cors`'s own `CorsOptions` - same names (`origin` included), same types, same defaults when a field is left out (`cors` applies its own, e.g. `origin: '*'`). Nothing here is reinvented or re-defaulted.

```ts
import { corsMiddleware } from '@beautinique/backend-middlewares';

app.use(
  corsMiddleware({
    origin: ['https://app.beautinique.com', /\.beautinique\.com$/],
    credentials: true,
  }),
);
```

Two things are added on top of plain `cors`:

| Addition                | Behaviour                                                                                                                                                                        |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Setup-time guard         | `credentials: true` combined with `origin: '*'`/`true` throws a `ConfigurationError` immediately (browsers reject that combination outright - fails fast at boot instead of at request time). |
| `onOriginDenied`         | Optional. Called with the rejected `Origin` value whenever `origin` is a static value (string/`RegExp`/`boolean`/array) and didn't match - e.g. for logging/alerting. Not called when `origin` is itself a custom `(requestOrigin, callback)` matcher (it already has full control). |

The request itself is never rejected because of a CORS mismatch - headers are simply omitted, and it's the browser, not this middleware, that then blocks the response from being read cross-origin.

## `checkEmptyRequest`

Rejects requests missing required parts (body/file/files/params/query) before they reach a route handler.

```ts
import { checkEmptyRequest } from '@beautinique/backend-middlewares';

app.post('/login', checkEmptyRequest({ body: true }), loginHandler);
```

## `serviceAccess`

Restricts a route to internal callers via a shared-secret header, compared in constant time (`crypto.timingSafeEqual`) to avoid timing attacks.

```ts
import { serviceAccess } from '@beautinique/backend-middlewares';

app.use(serviceAccess({ secret: process.env.INTERNAL_SERVICE_SECRET! }));
```

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
