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

/** Options accepted by `successResponse`. */
export interface ISuccessResponseOptions {
  /** Message used when a `res.success(...)` call doesn't provide its own. @default 'Success' */
  defaultMessage?: string;
}

/** Options accepted by `res.success(...)`, attached by `successResponse`. */
export interface ISendSuccessOptions<T = unknown> {
  /** Response payload. Omitted from the JSON body entirely when left out. */
  data?: T;
  /** Overrides the `successResponse` factory's `defaultMessage` for this call. */
  message?: string;
  /** @default 200 */
  statusCode?: number;
}

/** Options accepted by `errorResponse`. */
export interface IErrorResponseOptions {
  /**
   * Include the underlying error's stack trace in the JSON response.
   *
   * Invaluable in development, but must stay off in production - a stack
   * trace can leak internal file paths and module layout to API clients.
   *
   * @default process.env.IS_DEV === 'true'
   */
  includeStack?: boolean;
}
