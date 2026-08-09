import type { Level } from 'pino';

import { HTTP_STATUS_LOG_LEVEL_THRESHOLD } from '../constants/index.js';

/**
 * Derives a Pino log level from an HTTP response status code (and whether
 * an error occurred while handling the request).
 *
 * Extracted as a standalone, pure function - rather than an inline closure
 * inside `createHttpLogger` - so the 2xx/3xx→info, 4xx→warn, 5xx→error
 * mapping is unit-testable in isolation and reusable if additional HTTP
 * integrations (e.g. a Fastify plugin) are added later.
 *
 * @param statusCode - The HTTP response status code.
 * @param hasError - Whether the request handler raised/passed an error.
 * @returns `'error'` for 5xx responses or unhandled errors, `'warn'` for
 * 4xx responses, otherwise `'info'`.
 */
export function getLogLevelForStatus(statusCode: number, hasError: boolean): Level {
  if (hasError || statusCode >= HTTP_STATUS_LOG_LEVEL_THRESHOLD.SERVER_ERROR) {
    return 'error';
  }

  if (statusCode >= HTTP_STATUS_LOG_LEVEL_THRESHOLD.CLIENT_ERROR) {
    return 'warn';
  }

  return 'info';
}
