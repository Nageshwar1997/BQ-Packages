# @beautinique/backend-response

Consistent Express response handling for Beautinique backend services - a JSON success envelope, centralized error handling, a branded 404, and an async route wrapper.

## Installation

```bash
npm install @beautinique/backend-response
```

`express` is a peer dependency - install whichever version your service already uses.

## Wiring it together

```ts
import { errorResponse, notFoundResponse, successResponse, tryCatch } from '@beautinique/backend-response';

app.use(successResponse()); // near the top, before routes

app.use('/api', routes); // routes use tryCatch(...) internally

app.use(notFoundResponse({ serveHtml: true })); // after routes
app.use(errorResponse()); // last
```

## `successResponse`

Attaches `res.success(...)` - a consistent `{ success: true, message, data? }` JSON response helper - to every request, so route handlers don't have to hand-build that envelope themselves.

```ts
app.use(successResponse());

app.get(
  '/users/:id',
  tryCatch(async (req, res) => {
    const user = await userService.findById(req.params.id);
    res.success({ data: user, message: 'User fetched' });
  }),
);
```

| Option           | Default   | Description                                                          |
| ----------------- | --------- | ---------------------------------------------------------------------- |
| `defaultMessage`  | `Success` | Used whenever a `res.success(...)` call doesn't provide its own.     |

`data` is omitted from the JSON body entirely when not provided, rather than being sent as `null`/`undefined`.

## `tryCatch`

Wraps an async Express route handler so any thrown/rejected error is forwarded to `next(error)` instead of crashing the process or hanging the request, and gives the handler three deferred lifecycle hooks via `res.locals`:

- `res.locals.afterResponse` - run after the handler resolves successfully.
- `res.locals.afterRollback` - run if the handler throws/rejects.
- `res.locals.afterFinish` - always run once the HTTP response has fully finished sending.

```ts
app.post(
  '/orders',
  tryCatch(async (req, res) => {
    const order = await orderService.create(req.body);

    res.locals.afterResponse?.push(async () => {
      await notifyWarehouse(order.id);
    });

    res.success({ data: order, statusCode: 201 });
  }),
);
```

Express-only, no database/session dependency - safe to use in any service, including one with no database at all (e.g. an API gateway).

## `notFoundResponse`

Catch-all for requests that matched no route. Register it after every route, but before `errorResponse` - it turns "nothing else handled this request" into a `NotFoundError` and forwards it via `next(error)`, so it flows through the same error path as everything else.

```ts
app.use(notFoundResponse({ serveHtml: true }));
```

| Option      | Default                                    | Description                                                                                                            |
| ----------- | ------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `message`   | `(req) => \`Cannot ${req.method} ${req.originalUrl}\`` | Builds the `NotFoundError` message. Only used when `serveHtml` is off, or the request doesn't look like a browser navigation. |
| `serveHtml` | `false`                                     | Serve Beautinique's branded HTML 404 page for requests that look like a real browser navigation (an `Accept` header that explicitly includes `text/html`). JSON API clients still get the usual `NotFoundError` → `errorResponse` flow. |

## `errorResponse`

The app's centralized error-handling middleware. Register it LAST, after every route and other middleware - Express only recognizes a 4-argument function as error-handling middleware, and only errors that reach the end of the chain (e.g. via `next(error)`, as `tryCatch`/`checkEmptyRequest`/`serviceAccess` all do) end up here.

```ts
app.use(errorResponse());
```

Sends a `{ success: false, code, message, fieldErrors?, globalErrors? }` JSON response, using the thrown error's own `statusCode`/`code`/`message`/`fieldErrors`/`globalErrors` when it's a trusted operational `AppError` - otherwise a generic 500, never leaking the real error's message to the client.

| Option         | Default                         | Description                                                                                          |
| -------------- | -------------------------------- | -------------------------------------------------------------------------------------------------- |
| `includeStack` | `process.env.IS_DEV === 'true'` | Include the underlying error's stack trace in the JSON response. Must stay off in production. |

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
