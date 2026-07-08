import type { NextFunction, Request, Response } from 'express';

/**
 * An async Express route handler, as wrapped by `tryCatch`.
 *
 * Express-only - no database/session dependency, so this (and `tryCatch`
 * itself) is safe to use in any service, including one with no database
 * at all (e.g. an API gateway).
 */
export type TAsyncRequestHandler = (
  req: Request,
  res: Response,
  next: NextFunction,
) => Promise<unknown>;
