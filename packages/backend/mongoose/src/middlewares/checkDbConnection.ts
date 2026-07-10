import { ServiceUnavailableError } from '@beautinique/backend-classes';
import type { RequestHandler } from 'express';

import { connectionState } from '../states/index.js';

/** Options accepted by `checkDbConnection`. */
export interface ICheckDbConnectionOptions {
  /** @default 'Database connection is not ready.' */
  message?: string;
}

/**
 * Rejects requests with a `ServiceUnavailableError` (503) if the MongoDB
 * connection isn't ready yet, instead of letting the request sit in
 * mongoose's own query buffer (`bufferCommands`, ~10s timeout by default)
 * only to fail later with an opaque, generic 500.
 *
 * Register after `connectDb()` has been called, but before any route that
 * touches the database - NOT in front of a health/readiness endpoint,
 * which needs to report "not ready" rather than fail outright while the
 * DB is still connecting.
 *
 * @param options - `message` overrides the default `ServiceUnavailableError` message.
 * @returns An Express request handler.
 */
export const checkDbConnection = ({
  message = 'Database connection is not ready.',
}: ICheckDbConnectionOptions = {}): RequestHandler => {
  return (_req, _res, next) => {
    if (!connectionState.isConnected()) {
      throw new ServiceUnavailableError(message);
    }

    next();
  };
};
