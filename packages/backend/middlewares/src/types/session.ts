import type { NextFunction, Request, Response } from 'express';
import type { ClientSession } from 'mongoose';

/**
 * An async Express route handler that also receives an active mongoose
 * `ClientSession`, as wrapped by `tryCatchSession`.
 *
 * Only relevant to services with a MongoDB connection (via `mongoose`) -
 * kept in its own file (and its own `@beautinique/backend-middlewares/session`
 * entry point) specifically so a database-less service (e.g. an API
 * gateway) never needs `mongoose`'s types resolvable just to import this
 * package's database-agnostic exports (`tryCatch`, `checkEmptyRequest`, ...).
 */
export type TAsyncSessionRequestHandler = (
  req: Request,
  res: Response,
  next: NextFunction,
  session: ClientSession,
) => Promise<unknown>;
