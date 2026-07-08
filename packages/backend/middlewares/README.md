# @beautinique/backend-middlewares

Reusable Express middlewares for Beautinique backend services.

## Installation

```bash
npm install @beautinique/backend-middlewares
```

`cors` and `mongoose` are both **optional** peer dependencies - only install the one(s) a given service actually needs:

```bash
npm install cors      # only if this service uses corsMiddleware
npm install mongoose  # only if this service uses tryCatchSession
```

The base import (`@beautinique/backend-middlewares` - `checkEmptyRequest`, `serviceAccess`, `tryCatch`) never touches `cors` or `mongoose` at all, and never requires either to be installed - not even their *types*. `corsMiddleware` and `tryCatchSession` live in their own separate entry points precisely so a database-less service like an API gateway can depend on this package without ever needing `mongoose` (or, if it also skips CORS handling, `cors`) resolvable in its own `node_modules` - not as a runtime dependency, and not just to satisfy `tsc`.

Calling `corsMiddleware`/`tryCatchSession` without the matching package installed throws a clear `ConfigurationError` telling you what to install, instead of a cryptic module-not-found error.

## `tryCatch`

Wraps an async Express route handler so any thrown/rejected error is forwarded to `next(error)` instead of crashing the process or hanging the request. Framework-agnostic beyond Express itself - no database dependency, safe for every service, including a database-less API gateway.

```ts
import { tryCatch } from '@beautinique/backend-middlewares';

app.get(
  '/users/:id',
  tryCatch(async (req, res) => {
    const user = await userService.findById(req.params.id);
    res.json(user);
  }),
);
```

It also gives the handler three deferred lifecycle hooks via `res.locals` (typed out of the box, no casting needed):

| Hook                       | Runs                                                                 |
| --------------------------- | ----------------------------------------------------------------------- |
| `res.locals.afterResponse`  | After the handler resolves successfully.                              |
| `res.locals.afterRollback`  | If the handler throws/rejects.                                        |
| `res.locals.afterFinish`    | Always, once the HTTP response has fully finished sending.            |

```ts
tryCatch(async (req, res) => {
  const order = await orderService.create(req.body);
  res.locals.afterResponse?.push(async () => notifyWarehouse(order));
  res.json(order);
});
```

These are fire-and-forget: a failing hook is logged, never thrown, and never affects the response already sent.

## `tryCatchSession` (`@beautinique/backend-middlewares/session`)

The same wrapper as `tryCatch`, but for services with a MongoDB connection: it starts a `mongoose` session/transaction before calling the handler (which receives the active `ClientSession` as a 4th argument), commits on success, aborts on failure, and always ends the session. Requires `mongoose` - see the optional-dependency note above - which is exactly why it's a **separate entry point** rather than part of the base import: a gateway with no database never needs to know `mongoose` exists.

```ts
import { tryCatchSession } from '@beautinique/backend-middlewares/session';

app.post(
  '/orders',
  tryCatchSession(async (req, res, _next, session) => {
    const order = await Order.create([req.body], { session });
    res.locals.afterCommit?.push(async () => notifyWarehouse(order));
    res.json(order);
  }),
);
```

| Hook                       | Runs                                                                 |
| --------------------------- | ----------------------------------------------------------------------- |
| `res.locals.afterCommit`    | After the transaction commits.                                        |
| `res.locals.afterRollback`  | After the transaction is aborted.                                     |
| `res.locals.afterResponse`  | Also after the transaction commits (for hooks that don't care about the database specifically, for parity with plain `tryCatch`). |
| `res.locals.afterFinish`    | Always, once the HTTP response has fully finished sending.            |

If aborting the transaction itself fails, that failure is logged - the *original* error is still what reaches `next()`, and the session is always ended regardless.

## `corsMiddleware` (`@beautinique/backend-middlewares/cors`)

A thin, production-ready wrapper around the [`cors`](https://www.npmjs.com/package/cors) package. Every option is `cors`'s own `CorsOptions` - same names (`origin` included), same types, same defaults when a field is left out (`cors` applies its own, e.g. `origin: '*'`). Nothing here is reinvented or re-defaulted.

```ts
import { corsMiddleware } from '@beautinique/backend-middlewares/cors';

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
