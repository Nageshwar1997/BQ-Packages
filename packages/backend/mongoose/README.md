# @beautinique/backend-mongoose

Mongoose connection management, health/state reporting, and a transaction-aware Express middleware for Beautinique backend services.

## Installation

```bash
npm install @beautinique/backend-mongoose
```

`express` is a peer dependency - only required for `tryCatchSession`. Install whichever version your service already uses.

## Connection

```ts
import { connectDb, disconnectDB } from '@beautinique/backend-mongoose';

await connectDb({ uri: process.env.MONGO_URI!, enableGlobalCache: true });

// on shutdown
await disconnectDB();
```

## Health & state

```ts
import { connectionState, getConnectionHealth, mongoEvents } from '@beautinique/backend-mongoose';

if (connectionState.isConnected()) {
  /* ... */
}

app.get('/health', (_req, res) => res.json(getConnectionHealth()));

mongoEvents.on('error', (error) => logger.error({ err: error }, 'MongoDB error'));
```

## `tryCatchSession`

Wraps an async Express route handler in a mongoose transaction, plus a deferred-lifecycle-hook pattern via `res.locals` - the database-backed counterpart to `tryCatchResponse` from [`@beautinique/backend-response`](https://www.npmjs.com/package/@beautinique/backend-response).

```ts
import { tryCatchSession } from '@beautinique/backend-mongoose';

app.post(
  '/orders',
  tryCatchSession(async (req, res, next, session) => {
    const order = await orderService.create(req.body, { session });

    res.locals.afterCommit?.push(async () => {
      await notifyWarehouse(order.id);
    });

    res.success?.({ data: order, statusCode: 201 });
  }),
);
```

- Starts a session and transaction before calling the handler, which receives the active `ClientSession` as its 4th argument.
- Commits the transaction if the handler resolves, aborts it if the handler throws/rejects - the abort itself is guarded, so a failure aborting never masks the original error.
- Always ends the session afterwards, success or failure.
- `res.locals.afterCommit` - run after the transaction commits.
- `res.locals.afterRollback` - run after the transaction is aborted.
- `res.locals.afterResponse` - also run after the transaction commits (in addition to `afterCommit`), for hooks that don't care specifically about the database.
- `res.locals.afterFinish` - always run once the HTTP response has fully finished sending.

Any thrown/rejected error is forwarded to `next(error)`, so it flows through `errorResponse` from `@beautinique/backend-response` the same way as everywhere else. For database-less services, use `tryCatchResponse` instead.

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
