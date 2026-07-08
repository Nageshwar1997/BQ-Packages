import type { RequestHandler } from 'express';

import type { ISuccessResponseOptions } from '../../types/response.js';

/**
 * Attaches `res.success(...)` - a consistent `{ success: true, message,
 * data? }` JSON response helper - to every request, so route handlers
 * don't have to hand-build that envelope themselves.
 *
 * Register once, near the top of the middleware chain (before your
 * routes) - not per-route:
 *
 * ```ts
 * app.use(successResponse());
 *
 * app.get('/users/:id', tryCatch(async (req, res) => {
 *   const user = await userService.findById(req.params.id);
 *   res.success?.({ data: user, message: 'User fetched' });
 * }));
 * ```
 *
 * `data` is omitted from the JSON body entirely when not provided (e.g.
 * for a 204-style "it worked, nothing to return" response), rather than
 * being sent as `null`/`undefined`.
 *
 * @param options - `defaultMessage` is used whenever a `res.success(...)` call doesn't provide its own.
 * @returns An Express request handler.
 */
export function successResponse({ defaultMessage = 'Success' }: ISuccessResponseOptions = {}): RequestHandler {
  return (_req, res, next) => {
    res.success = ({ data, message = defaultMessage, statusCode = 200 } = {}) => {
      res.status(statusCode).json({
        success: true,
        message,
        ...(data !== undefined && { data }),
      });
    };

    next();
  };
}
