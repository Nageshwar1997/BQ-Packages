import { createRequire } from 'node:module';

import { ConfigurationError } from '@beautinique/backend-classes';
import type { CorsOptions } from 'cors';
import type { RequestHandler } from 'express';

import type { ICorsOptions } from '../types/index.js';

/**
 * The shape of the `cors` package's default export, narrowed down to just
 * what this module actually calls. `cors`'s own `.d.ts` merges a callable
 * function with a namespace (`export = e` over `declare function e(...) {}`
 * + `declare namespace e {...}`), which doesn't resolve cleanly through a
 * top-level `import type ... from 'cors'` - this minimal functional type
 * sidesteps that entirely.
 */
type TCorsFactory = (options?: CorsOptions) => RequestHandler;

const DEFAULT_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'];
const DEFAULT_ALLOWED_HEADERS = ['Content-Type', 'Authorization'];
const DEFAULT_EXPOSED_HEADERS = ['X-Request-Id'];
const DEFAULT_MAX_AGE_SECONDS = 600;

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
 * Lazily, synchronously loads the `cors` package the moment it's actually
 * needed.
 *
 * `cors` is an optional peer dependency (see package.json): most services
 * only need `checkEmptyRequest`/`serviceAccess`, so importing anything
 * from this package must never require `cors` to be installed - only
 * calling `corsMiddleware` itself should. `createRequire` keeps this
 * lookup synchronous (so `corsMiddleware` can keep returning a plain
 * `RequestHandler`, not a `Promise`) while still resolving `cors` lazily
 * instead of at module load time.
 */
function loadCors(): TCorsFactory {
  const require = createRequire(import.meta.url);

  try {
    return require('cors') as TCorsFactory;
  } catch (error) {
    throw new ConfigurationError(
      'corsMiddleware requires the "cors" package, which is not installed. Run `npm install cors` in this service.',
      { cause: error },
    );
  }
}

/**
 * Creates a production-ready CORS middleware.
 *
 * A thin wrapper around the `cors` package itself: `options` is passed
 * through to `cors()` untouched - same fields, same values, and any field
 * left out is resolved by `cors`'s own defaults (not ours). Only two
 * things are added on top:
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
 * @throws {ConfigurationError} At setup time, if `credentials` is enabled together with `origin: '*'`/`true`, or if `cors` is not installed.
 * @returns An Express request handler.
 */
export function corsMiddleware({ onOriginDenied, ...options }: ICorsOptions): RequestHandler {
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

  const cors = loadCors();

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
