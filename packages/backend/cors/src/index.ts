import { ConfigurationError } from '@beautinique/backend-classes';
import type { CorsOptions } from 'cors';
import cors from 'cors';
import type { RequestHandler } from 'express';

/**
 * Options accepted by `corsMiddleware`.
 *
 * Picked directly from `cors`'s own `CorsOptions` - same names, same
 * types, same defaults when a field is omitted (`cors` applies its own,
 * e.g. `origin: '*'`, `methods: 'GET,HEAD,PUT,PATCH,POST,DELETE'`) - so
 * upgrading the `cors` dependency never requires a change here.
 */
export interface ICorsOptions extends CorsOptions {
  /**
   * Called whenever a request carries an `Origin` header that did not
   * match `origin` - e.g. for logging/alerting. Only fires for the
   * static forms of `origin` (string/`RegExp`/`boolean`/array) - if
   * `origin` is itself a custom `(requestOrigin, callback)` matcher, it
   * already has full control, including its own logging. The request
   * itself is never rejected because of this: CORS headers are simply
   * omitted, and the browser (not this middleware) is what blocks the
   * response from being read cross-origin.
   */
  onOriginDenied?: (origin: string) => void;
}

const DEFAULT_METHODS: NonNullable<CorsOptions['methods']> = [
  'GET',
  'POST',
  'PUT',
  'PATCH',
  'DELETE',
  'OPTIONS',
];
const DEFAULT_ALLOWED_HEADERS: NonNullable<CorsOptions['allowedHeaders']> = [
  'Content-Type',
  'Authorization',
];
const DEFAULT_EXPOSED_HEADERS: NonNullable<CorsOptions['exposedHeaders']> = ['X-Request-Id'];
const DEFAULT_MAX_AGE_SECONDS: NonNullable<CorsOptions['maxAge']> = 600;

/** The non-callback members of `CorsOptions['origin']` - a `boolean`, `string`, `RegExp`, or a mix of those. */
type TCorsStaticOrigin = Exclude<CorsOptions['origin'], (...args: never[]) => unknown>;

/** Whether `requestOrigin` satisfies a static origin value (mirrors `cors`'s own matching rules). */
function matchesStaticOrigin(requestOrigin: string, pattern: TCorsStaticOrigin): boolean {
  if (pattern === undefined || pattern === '*') {
    return true;
  }

  if (typeof pattern === 'boolean') {
    return pattern;
  }

  if (Array.isArray(pattern)) {
    return pattern.some((entry) => matchesStaticOrigin(requestOrigin, entry));
  }

  return typeof pattern === 'string' ? pattern === requestOrigin : pattern.test(requestOrigin);
}

/**
 * Creates a production-ready CORS middleware for Express.
 *
 * A thin wrapper around the `cors` package itself: `options` is passed
 * through to `cors()` untouched - same fields, same values, and any field
 * left out is resolved by `cors`'s own defaults (not ours), except for the
 * few fields this package applies safer defaults for (see below). Only
 * two things are added on top:
 *
 *  - A setup-time guard: `credentials: true` combined with `origin: '*'`
 *    (or `true`) is rejected immediately, since browsers reject that
 *    combination outright - failing fast at boot beats a confusing
 *    runtime CORS failure.
 *  - `onOriginDenied`, an optional hook called whenever a request's
 *    `Origin` didn't match a *static* `origin` value (string/`RegExp`/
 *    `boolean`/array). If `origin` is itself a custom matcher function,
 *    it is passed straight through to `cors` unmodified and this hook
 *    does not apply (that function already has full control).
 *
 * @param options - Any `cors` `CorsOptions`, plus the optional `onOriginDenied` hook.
 * @throws {ConfigurationError} At setup time, if `credentials` is enabled together with `origin: '*'`/`true`.
 * @returns An Express request handler.
 */
export function checkCors({ onOriginDenied, ...options }: ICorsOptions): RequestHandler {
  const {
    origin,
    credentials = false,
    methods = DEFAULT_METHODS,
    allowedHeaders = DEFAULT_ALLOWED_HEADERS,
    exposedHeaders = DEFAULT_EXPOSED_HEADERS,
    maxAge = DEFAULT_MAX_AGE_SECONDS,
    optionsSuccessStatus,
    preflightContinue = false,
  } = options;

  if (credentials && (origin === '*' || origin === true)) {
    throw new ConfigurationError(
      'CORS misconfiguration: "credentials" cannot be enabled together with origin: "*"/true - browsers reject this combination. Provide an explicit origin allowlist instead.',
    );
  }

  const finalOptions: CorsOptions = {
    origin,
    credentials,
    methods,
    allowedHeaders,
    exposedHeaders,
    maxAge,
    optionsSuccessStatus,
    preflightContinue,
  };

  if (typeof origin === 'function' || !onOriginDenied) {
    return cors(finalOptions);
  }

  return cors({
    ...finalOptions,
    origin: (requestOrigin, callback) => {
      if (!requestOrigin) {
        callback(null, true);
        return;
      }

      const allowed = matchesStaticOrigin(requestOrigin, origin);

      if (!allowed) {
        onOriginDenied(requestOrigin);
      }

      callback(null, allowed);
    },
  });
}
