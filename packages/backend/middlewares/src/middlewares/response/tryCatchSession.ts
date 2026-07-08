import { createRequire } from 'node:module';

import { ConfigurationError } from '@beautinique/backend-classes';
import type { RequestHandler } from 'express';
import type { ClientSession } from 'mongoose';

import type { TAsyncSessionRequestHandler } from '../../types/session.js';
import { runTasks } from './run-tasks.js';

/** The one piece of `mongoose`'s default export this module actually calls. */
type TStartSession = () => Promise<ClientSession>;

/**
 * Lazily, synchronously loads `mongoose`'s `startSession` the moment it's
 * actually needed.
 *
 * `mongoose` is an optional peer dependency (see package.json): only
 * services with a MongoDB connection - typically not an API gateway -
 * need `tryCatchSession`, so importing anything from this package must
 * never require `mongoose` to be installed, only calling
 * `tryCatchSession` itself should. `createRequire` keeps this lookup
 * synchronous (so `tryCatchSession` can keep returning a plain
 * `RequestHandler`, not a `Promise`) while still resolving `mongoose`
 * lazily instead of at module load time.
 */
function loadStartSession(): TStartSession {
  const require = createRequire(import.meta.url);

  try {
    return (require('mongoose') as { startSession: TStartSession }).startSession;
  } catch (error) {
    throw new ConfigurationError(
      'tryCatchSession requires the "mongoose" package, which is not installed. Run `npm install mongoose` in this service.',
      { cause: error },
    );
  }
}

/**
 * Wraps an async Express route handler in a mongoose transaction, plus
 * the same deferred-lifecycle-hook pattern as `tryCatch`:
 *
 *  - Starts a session and transaction before calling the handler, which
 *    receives the active `ClientSession` as its 4th argument.
 *  - Commits the transaction if the handler resolves, aborts it if the
 *    handler throws/rejects - the abort itself is also guarded, so a
 *    failure aborting never masks the original error.
 *  - Always ends the session afterwards, success or failure.
 *  - `res.locals.afterCommit` - run after the transaction commits.
 *  - `res.locals.afterRollback` - run after the transaction is aborted.
 *  - `res.locals.afterResponse` - also run after the transaction commits
 *    (in addition to `afterCommit`) - for hooks that don't care
 *    specifically about the database, for parity with plain `tryCatch`.
 *  - `res.locals.afterFinish` - always run once the HTTP response has
 *    fully finished sending.
 *
 * Only usable in services with a MongoDB connection (via `mongoose`) -
 * NOT in a database-less service like an API gateway. For those, use
 * `tryCatch` instead, from the base `@beautinique/backend-middlewares` entry.
 *
 * @param handler - The async route handler to wrap; receives the active `ClientSession` as a 4th argument.
 * @throws {ConfigurationError} If `mongoose` is not installed.
 * @returns An Express request handler.
 */
export function tryCatchSession(handler: TAsyncSessionRequestHandler): RequestHandler {
  const startSession = loadStartSession();

  return async (req, res, next) => {
    const session = await startSession();

    res.locals.afterCommit = [];
    res.locals.afterRollback = [];
    res.locals.afterResponse = [];
    res.locals.afterFinish = [];

    res.once('finish', () => {
      void runTasks(res.locals.afterFinish);
    });

    try {
      session.startTransaction();

      await handler(req, res, next, session);

      await session.commitTransaction();

      await runTasks(res.locals.afterCommit);
      await runTasks(res.locals.afterResponse);
    } catch (error) {
      try {
        await session.abortTransaction();
      } catch (abortError) {
        console.error('[backend-middlewares] failed to abort transaction:', abortError);
      }

      await runTasks(res.locals.afterRollback);

      next(error);
    } finally {
      await session.endSession();
    }
  };
}
