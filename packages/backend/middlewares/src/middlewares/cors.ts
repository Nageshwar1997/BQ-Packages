import { ConfigurationError } from '@beautinique/backend-classes';
import cors from 'cors';
import type { RequestHandler } from 'express';

import type { ICorsOptions, TCorsOrigins } from '../types/index.js';

const DEFAULT_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'];
const DEFAULT_ALLOWED_HEADERS = ['Content-Type', 'Authorization'];
const DEFAULT_EXPOSED_HEADERS = ['X-Request-Id'];
const DEFAULT_MAX_AGE_SECONDS = 600;
const DEFAULT_OPTIONS_SUCCESS_STATUS = 204;

/** Whether `origin` (the request's `Origin` header value) satisfies `origins`. */
function isOriginAllowed(origin: string, origins: TCorsOrigins): boolean {
  if (origins === '*') {
    return true;
  }

  if (typeof origins === 'function') {
    return origins(origin);
  }

  const patterns = Array.isArray(origins) ? origins : [origins];

  return patterns.some((pattern) =>
    typeof pattern === 'string' ? pattern === origin : pattern.test(origin),
  );
}

/**
 * Creates a production-ready, reusable CORS middleware.
 *
 * Wraps the battle-tested `cors` package (rather than reimplementing
 * preflight handling and header composition) with secure-by-default
 * behaviour:
 *
 *  - Allowed origins are matched individually and the specific matching
 *    origin is reflected back - never a blanket `*` - whenever
 *    `credentials` is enabled, since browsers reject
 *    `Access-Control-Allow-Origin: *` together with credentialed
 *    requests. That combination is rejected here at setup time, before it
 *    can cause a confusing runtime CORS failure.
 *  - A request with no `Origin` header (server-to-server calls, curl,
 *    mobile apps, same-origin requests) is always passed through as-is:
 *    CORS is a browser enforcement mechanism, not an API access-control
 *    mechanism, so it has nothing to say about non-browser callers.
 *  - A request whose `Origin` does not match `origins` is never rejected
 *    with an error - CORS headers are simply omitted, and it's the
 *    browser, not this middleware, that then blocks the response from
 *    being read cross-origin. Observe denials via `onOriginDenied` if
 *    you need to log/alert on them.
 *
 * @param options - `origins` is required; everything else has a secure, sensible default.
 * @throws {ConfigurationError} At setup time, if `credentials` is enabled together with `origins: '*'`.
 * @returns An Express request handler.
 */

export function corsMiddleware({
  origins,
  credentials = false,
  methods = DEFAULT_METHODS,
  allowedHeaders = DEFAULT_ALLOWED_HEADERS,
  exposedHeaders = DEFAULT_EXPOSED_HEADERS,
  maxAge = DEFAULT_MAX_AGE_SECONDS,
  optionsSuccessStatus = DEFAULT_OPTIONS_SUCCESS_STATUS,
  onOriginDenied,
}: ICorsOptions): RequestHandler {
  if (credentials && origins === '*') {
    throw new ConfigurationError(
      'CORS misconfiguration: "credentials" cannot be enabled together with origins: "*" - browsers reject this combination. Provide an explicit origin allowlist instead.',
    );
  }

  return cors({
    credentials,
    methods,
    allowedHeaders,
    exposedHeaders,
    maxAge,
    optionsSuccessStatus,
    preflightContinue: false,
    origin: (requestOrigin, callback) => {
      if (!requestOrigin) {
        callback(null, true);
        return;
      }

      if (isOriginAllowed(requestOrigin, origins)) {
        callback(null, true);
        return;
      }

      onOriginDenied?.(requestOrigin);
      callback(null, false);
    },
  });
}
