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

/** A single allowed-origin matcher: an exact string, or a `RegExp` (e.g. for subdomain patterns). */
export type TCorsOriginPattern = string | RegExp;

/**
 * Which origins `corsMiddleware` should allow:
 *  - the literal string `'*'` - any origin (only valid when `credentials`
 *    is not enabled; not its own type constituent since it's already a
 *    `string`, but special-cased at runtime).
 *  - a pattern, or list of patterns - exact strings and/or `RegExp`s.
 *  - a predicate - full custom matching logic, given the request's `Origin` header value.
 */
export type TCorsOrigins =
  TCorsOriginPattern | TCorsOriginPattern[] | ((origin: string) => boolean);

export interface ICorsOptions extends Pick<
  CorsOptions,
  | 'allowedHeaders'
  | 'credentials'
  | 'exposedHeaders'
  | 'methods'
  | 'maxAge'
  | 'optionsSuccessStatus'
> {
  /** Which origins are allowed to make cross-origin requests. */
  origins: TCorsOrigins;

  /**
   * Called whenever a request carries an `Origin` header that did not
   * match `origins` - e.g. for logging/alerting. The request itself is
   * never rejected because of this: CORS headers are simply omitted, and
   * the browser (not this middleware) is what blocks the response from
   * being read cross-origin.
   */
  onOriginDenied?: (origin: string) => void;
}
