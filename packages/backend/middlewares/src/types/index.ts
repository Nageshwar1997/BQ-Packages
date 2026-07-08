import type { CorsOptions } from 'cors';

export interface IRequestCheckOptions {
  body?: boolean;
  file?: boolean;
  fileOrBody?: boolean;
  filesOrBody?: boolean;
  files?: boolean;
  params?: boolean;
  query?: boolean;
}

export interface IServiceAccessOptions {
  headerName?: string;
  secret: string;
}

/**
 * Options accepted by `corsMiddleware`.
 *
 * Picked directly from `cors`'s own `CorsOptions` - same names, same
 * types, same defaults when a field is omitted (`cors` applies its own,
 * e.g. `origin: '*'`, `methods: 'GET,HEAD,PUT,PATCH,POST,DELETE'`) - so
 * upgrading the `cors` dependency never requires a change here.
 * `preflightContinue` isn't picked; this middleware always lets `cors`
 * terminate the preflight response itself.
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
