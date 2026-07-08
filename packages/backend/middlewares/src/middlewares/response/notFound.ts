import { NotFoundError } from '@beautinique/backend-classes';
import type { Request, RequestHandler } from 'express';

import type { INotFoundOptions } from '../../types/response.js';

const defaultMessage = (req: Request) => `Cannot ${req.method} ${req.originalUrl}`;

/**
 * Catch-all for requests that matched no route.
 *
 * Register it after every route, but before `errorResponse` - it simply
 * turns "nothing else handled this request" into a `NotFoundError` and
 * forwards it via `next(error)`, so it flows through the same error path
 * as everything else (`errorResponse` then formats and sends the actual
 * `404` response):
 *
 * ```ts
 * app.use('/api', routes);
 * app.use(notFound());     // after routes
 * app.use(errorResponse()); // last
 * ```
 *
 * @param options - `message` overrides the default `Cannot <METHOD> <path>` message.
 * @returns An Express request handler.
 */
export function notFound({ message = defaultMessage }: INotFoundOptions = {}): RequestHandler {
  return (req, _res, next) => {
    next(new NotFoundError(message(req)));
  };
}
