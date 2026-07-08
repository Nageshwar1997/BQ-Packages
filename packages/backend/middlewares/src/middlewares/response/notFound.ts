import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { NotFoundError } from '@beautinique/backend-classes';
import type { Request, RequestHandler } from 'express';

import type { INotFoundOptions } from '../../types/response.js';

const defaultMessage = (req: Request) => `Cannot ${req.method} ${req.originalUrl}`;

/**
 * Reads the bundled Beautinique-branded 404 page once, at setup time (not
 * per-request).
 *
 * Resolved relative to this module's own compiled location - one level up
 * from `dist/`, where `public/` ships alongside it (see package.json
 * `files`) - rather than `process.cwd()`, so it works regardless of where
 * the consuming service is started from, including once this package is
 * installed under `node_modules`.
 *
 * Never throws: if the file can't be read (e.g. a broken install missing
 * the `public/` folder), this logs a warning and `notFound` simply falls
 * back to its normal JSON behaviour - a missing decorative asset should
 * never take down request handling.
 */
function loadNotFoundHtml(): string | undefined {
  try {
    const htmlPath = join(dirname(fileURLToPath(import.meta.url)), '../public/not-found.html');

    return readFileSync(htmlPath, 'utf-8');
  } catch (error) {
    console.error(
      '[backend-middlewares] notFound({ serveHtml: true }) could not read its bundled HTML page - falling back to JSON:',
      error,
    );

    return undefined;
  }
}

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
 * With `serveHtml: true`, a request that looks like a real browser
 * navigation (its `Accept` header explicitly includes `text/html` - a
 * plain `fetch`/`axios` call typically does not) instead gets
 * Beautinique's branded 404 page directly, bypassing `errorResponse`
 * entirely. Any other request (a JSON API client) still gets the usual
 * `NotFoundError` → `errorResponse` JSON flow either way:
 *
 * ```ts
 * app.use(notFound({ serveHtml: true }));
 * ```
 *
 * @param options - `message` overrides the default `Cannot <METHOD> <path>` message; `serveHtml` enables the branded HTML page for browser requests.
 * @returns An Express request handler.
 */
export function notFound({
  message = defaultMessage,
  serveHtml = false,
}: INotFoundOptions = {}): RequestHandler {
  const html = serveHtml ? loadNotFoundHtml() : undefined;

  return (req, res, next) => {
    if (html && req.headers.accept?.includes('text/html')) {
      res.status(404).type('html').send(html);
      return;
    }

    next(new NotFoundError(message(req)));
  };
}
