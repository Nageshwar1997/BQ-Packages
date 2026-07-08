import type { RequestHandler } from 'express';

import type { TAsyncRequestHandler } from '../../types/response.js';
import { runTasks } from './run-tasks.js';

/**
 * Wraps an async Express route handler so any thrown/rejected error is
 * forwarded to `next(error)` - instead of crashing the process or hanging
 * the request - and gives the handler three deferred lifecycle hooks via
 * `res.locals`:
 *
 *  - `res.locals.afterResponse` - run after the handler resolves successfully.
 *  - `res.locals.afterRollback` - run if the handler throws/rejects.
 *  - `res.locals.afterFinish` - always run once the HTTP response has
 *    fully finished sending, regardless of success/failure.
 *
 * Express-only, no database/session dependency - safe to use in any
 * service, including one with no database at all (e.g. an API gateway).
 * For services that also need a mongoose transaction wrapped around the
 * handler, use `tryCatchSession` instead, from the separate
 * `@beautinique/backend-middlewares/session` entry point (kept separate
 * so `mongoose` never needs to be installed just to use this one).
 *
 * @param handler - The async route handler to wrap.
 * @returns An Express request handler.
 */
export function tryCatch(handler: TAsyncRequestHandler): RequestHandler {
  return async (req, res, next) => {
    res.locals.afterResponse = [];
    res.locals.afterRollback = [];
    res.locals.afterFinish = [];

    res.once('finish', () => {
      void runTasks(res.locals.afterFinish);
    });

    try {
      await handler(req, res, next);

      await runTasks(res.locals.afterResponse);
    } catch (error) {
      await runTasks(res.locals.afterRollback);

      next(error);
    }
  };
}
