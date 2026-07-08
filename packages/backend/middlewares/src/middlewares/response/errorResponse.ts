import { AppError, InternalServerError } from '@beautinique/backend-classes';
import type { ErrorRequestHandler } from 'express';

import type { IErrorResponseOptions } from '../../types/response.js';

/** A safe, generic message shown to clients for anything that isn't a trusted operational error. */
const GENERIC_MESSAGE = 'Something went wrong. Please try again later.';

/**
 * Normalizes any thrown/rejected value into an `AppError` safe to expose
 * to a client.
 *
 * An `AppError` marked `isOperational` (the default for every built-in
 * error class in `@beautinique/backend-classes`) is trusted as-is - it
 * was deliberately thrown with a client-safe message and status code.
 * Anything else - a non-operational `AppError`, or a completely unknown
 * thrown value (a bug: a raw `TypeError`, a rejected promise with no
 * `Error` at all, ...) - is wrapped in a generic `InternalServerError`
 * instead of ever exposing its actual message, which might contain
 * internal details (a database error, a stack trace, ...) never meant
 * for a client. The original value is preserved as `cause`, so it's
 * still available for `includeStack`/upstream logging.
 */
function toClientError(error: unknown): AppError {
  if (error instanceof AppError && error.isOperational) {
    return error;
  }

  return new InternalServerError(GENERIC_MESSAGE, { cause: error });
}

/**
 * Creates the app's centralized error-handling middleware.
 *
 * Register it LAST, after every route and other middleware - Express
 * only recognizes a 4-argument function as error-handling middleware,
 * and only errors that reach the end of the chain (e.g. via
 * `next(error)`, as `tryCatch`/`tryCatchSession`/`checkEmptyRequest`/
 * `serviceAccess` all do) end up here:
 *
 * ```ts
 * app.use('/api', routes);
 * app.use(errorResponse()); // last
 * ```
 *
 * Sends a `{ success: false, code, message, fieldErrors?, globalErrors? }`
 * JSON response, using the thrown error's own `statusCode`/`code`/
 * `message`/`fieldErrors`/`globalErrors` when it's a trusted operational
 * `AppError` - otherwise a generic 500, never leaking the real error's
 * message to the client. If the response has already started sending
 * (`res.headersSent`), this defers to Express's own default error
 * handler instead (the standard, Express-documented guard - attempting
 * to send a second response at that point would throw).
 *
 * @param options - `includeStack` controls whether the response also includes the underlying error's stack trace.
 * @returns An Express error-handling middleware.
 */
export function errorResponse({ includeStack }: IErrorResponseOptions = {}): ErrorRequestHandler {
  const shouldIncludeStack = includeStack ?? process.env.IS_DEV === 'true';

  return (error, _req, res, next) => {
    if (res.headersSent) {
      next(error);
      return;
    }

    const clientError = toClientError(error);
    const stackSource = clientError.cause instanceof Error ? clientError.cause : clientError;

    res.status(clientError.statusCode).json({
      success: false,
      code: clientError.code,
      message: clientError.message,
      ...(clientError.fieldErrors && { fieldErrors: clientError.fieldErrors }),
      ...(clientError.globalErrors && { globalErrors: clientError.globalErrors }),
      ...(shouldIncludeStack && { stack: stackSource.stack }),
    });
  };
}
