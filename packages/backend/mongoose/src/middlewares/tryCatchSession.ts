import { runTasks } from '@beautinique/backend-utils';
import type { NextFunction, Request, RequestHandler, Response } from 'express';
import type { ClientSession } from 'mongoose';
import { startSession } from 'mongoose';

/**
 * An async Express route handler that also receives an active mongoose
 * `ClientSession`, as wrapped by `tryCatchSession`.
 */
export type TAsyncSessionRequestHandler = (
  req: Request,
  res: Response,
  next: NextFunction,
  session: ClientSession,
) => Promise<unknown>;

/**
 * Wraps an async Express route handler in a mongoose transaction, plus the
 * same deferred-lifecycle-hook pattern as `@beautinique/backend-response`'s
 * `tryCatchResponse`:
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
 *    specifically about the database, for parity with `tryCatchResponse`.
 *  - `res.locals.afterFinish` - always run once the HTTP response has
 *    fully finished sending.
 *
 * Only usable in services with a MongoDB connection. For database-less
 * services, use `tryCatchResponse` from `@beautinique/backend-response`
 * instead.
 *
 * @param handler - The async route handler to wrap; receives the active `ClientSession` as a 4th argument.
 * @returns An Express request handler.
 */
export function tryCatchSession(handler: TAsyncSessionRequestHandler): RequestHandler {
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
        console.error('[backend-mongoose] failed to abort transaction:', abortError);
      }

      await runTasks(res.locals.afterRollback);

      next(error);
    } finally {
      await session.endSession();
    }
  };
}
