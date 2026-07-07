# @beautinique/backend-middlewares

Reusable Express middlewares for Beautinique backend services.

## Installation

```bash
npm install @beautinique/backend-middlewares
```

## `corsMiddleware`

Production-ready CORS middleware (wraps the [`cors`](https://www.npmjs.com/package/cors) package) with secure defaults: no blanket `*` when credentials are enabled, disallowed origins are never treated as errors (the browser enforces CORS, not this middleware), and non-browser requests (no `Origin` header) always pass through.

```ts
import { corsMiddleware } from '@beautinique/backend-middlewares';

app.use(
  corsMiddleware({
    origins: ['https://app.beautinique.com', /\.beautinique\.com$/],
    credentials: true,
  }),
);
```

| Option                 | Default                                          | Description                                                                 |
| ---------------------- | ------------------------------------------------- | ----------------------------------------------------------------------------- |
| `origins`               | _(required)_                                      | `'*'`, a string/`RegExp`, an array of them, or a `(origin) => boolean` predicate. |
| `credentials`           | `false`                                            | Allow cookies/`Authorization` cross-origin. Cannot be combined with `origins: '*'`. |
| `methods`               | `['GET','POST','PUT','PATCH','DELETE','OPTIONS']` | Allowed HTTP methods.                                                        |
| `allowedHeaders`        | `['Content-Type','Authorization']`                | Request headers the client may send.                                        |
| `exposedHeaders`        | `['X-Request-Id']`                                | Response headers exposed to browser JS.                                     |
| `maxAge`                | `600`                                              | Preflight cache duration, in seconds.                                       |
| `optionsSuccessStatus`  | `204`                                              | Status code for successful preflight responses.                             |
| `onOriginDenied`        | `undefined`                                       | Called with the rejected `Origin` value - e.g. for logging/alerting.        |

Passing `credentials: true` together with `origins: '*'` throws a `ConfigurationError` at setup time (browsers reject that combination outright, so this fails fast at boot instead of at request time).

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
