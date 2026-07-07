import { createHash, timingSafeEqual } from 'node:crypto';

import {
  AuthorizationError,
  InternalServerError,
  ValidationError,
} from '@beautinique/backend-classes';
import type { RequestHandler } from 'express';

import type { IRequestCheckOptions, IServiceAccessOptions } from './types/index.js';

/**
 * `true` when `value` is missing, or is an object/array with no own keys
 * (covers `req.body`, `req.file`, `req.files` - single object, array, or
 * multer's `{ [fieldname]: File[] }` shape - and `req.params`/`req.query`).
 */
function isEmptyValue(value: unknown): boolean {
  return !value || (typeof value === 'object' && Object.keys(value).length === 0);
}

/**
 * Rejects requests that are missing required parts, before they ever reach
 * a route handler.
 *
 * Every flag in `options` is opt-in (all default to not required), so an
 * empty `{}` allows any request through unchanged. When multiple flags are
 * combined, checks are evaluated in the order below and the first
 * violation wins (later checks are skipped once one throws).
 *
 * @param options - Which parts of the request must be present.
 * @returns An Express request handler that calls `next(error)` with a
 * `ValidationError` on the first failed check, or `next()` otherwise.
 */
export const checkEmptyRequest = (options: IRequestCheckOptions): RequestHandler => {
  const { body, file, files, fileOrBody, filesOrBody, params, query } = options;

  return (req, _res, next) => {
    try {
      const isBodyEmpty = isEmptyValue(req.body);
      const isFileEmpty = isEmptyValue(req.file);
      const isFilesEmpty = isEmptyValue(req.files);
      const isParamsEmpty = isEmptyValue(req.params);
      const isQueryEmpty = isEmptyValue(req.query);

      // Case 1: body or files (plural) required, both empty
      if (filesOrBody && !file && isBodyEmpty && isFilesEmpty) {
        throw new ValidationError('Please provide some data in the body or files!');
      }

      // Case 2: body or a single file required, both empty
      if (fileOrBody && !files && isBodyEmpty && isFileEmpty) {
        throw new ValidationError('Please provide some data in the body or file!');
      }

      // Case 3: only body required, empty
      if (!files && !file && body && isBodyEmpty) {
        throw new ValidationError('Please provide some data in the body!');
      }

      // Case 4: only files (plural) required, empty
      if (files && !file && !body && isFilesEmpty) {
        throw new ValidationError('Please provide some files!');
      }

      // Case 5: only a single file required, empty
      if (file && !files && !body && isFileEmpty) {
        throw new ValidationError('Please provide a file!');
      }

      // Case 6: params required, empty
      if (params && isParamsEmpty) {
        throw new ValidationError('Please provide some params!');
      }

      // Case 7: query required, empty
      if (query && isQueryEmpty) {
        throw new ValidationError('Please provide some query!');
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

/** SHA-256 digest of `value`, used so secrets of any length compare in constant time. */
function digest(value: string) {
  return createHash('sha256').update(value).digest();
}

/**
 * Restricts access to trusted internal callers via a shared secret header
 * (service-to-service auth - e.g. an internal gateway calling a downstream
 * microservice directly).
 *
 * The configured secret is validated once, at setup time (so a
 * misconfigured deployment fails fast at boot instead of on every
 * request), and compared using a hash + `timingSafeEqual` rather than
 * `===` so a mismatch can't be inferred from response timing, and secrets
 * of different lengths never throw (a raw `timingSafeEqual` requires
 * equal-length buffers).
 *
 * @param options - `secret` is required; `headerName` defaults to `X-Service-Secret`.
 * @throws {InternalServerError} At setup time, if `secret` is missing/blank.
 * @returns An Express request handler that throws {@link AuthorizationError}
 * when the header is missing or does not match.
 */
export const serviceAccess = ({
  secret,
  headerName = 'X-Service-Secret',
}: IServiceAccessOptions): RequestHandler => {
  const trimmedSecret = secret.trim();

  if (!trimmedSecret) {
    throw new InternalServerError('Service secret is not defined.');
  }

  const expectedDigest = digest(trimmedSecret);

  return (req, _res, next) => {
    const providedSecret = req.get(headerName)?.trim();

    const isAuthorized =
      !!providedSecret && timingSafeEqual(digest(providedSecret), expectedDigest);

    if (!isAuthorized) {
      throw new AuthorizationError('You are not authorized to access this service.');
    }

    next();
  };
};
