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

/** Options accepted by `notFound`. */
export interface INotFoundOptions {
  /**
   * Builds the `NotFoundError` message for a request that matched no
   * route. Only used when `serveHtml` is off, or the request doesn't look
   * like a browser navigation.
   *
   * @default (req) => `Cannot ${req.method} ${req.originalUrl}`
   */
  message?: (req: Request) => string;

  /**
   * Serve Beautinique's branded HTML 404 page instead of the usual JSON
   * error, for requests that look like a real browser navigation (an
   * `Accept` header that explicitly includes `text/html`). JSON API
   * clients still get the normal `NotFoundError` → `errorResponse` flow
   * either way.
   *
   * @default false
   */
  serveHtml?: boolean;
}
