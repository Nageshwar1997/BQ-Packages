import { createHash, timingSafeEqual } from 'node:crypto';

import { AuthorizationError, InternalServerError } from '@beautinique/backend-classes';
import type { RequestHandler } from 'express';

import type { IServiceAccessOptions } from './types.js';

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

export const checkServiceAccess = ({
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
