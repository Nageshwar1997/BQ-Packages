import type { redactOptions } from 'pino';

import { DEFAULT_REDACT_PATHS } from '../constants/index.js';
import type { ILoggerOptions } from '../types/index.js';

/**
 * Builds the Pino `redact` configuration for a logger.
 *
 * Always includes {@link DEFAULT_REDACT_PATHS} - the package's baseline
 * secure defaults - and additively merges any consumer-supplied paths on
 * top. Consumers can never *remove* a default redaction path, only add
 * more, so a misconfigured service cannot accidentally disable the
 * package's security guarantees.
 *
 * @param options - The `createLogger` options `redact` is read from.
 * @returns A complete Pino `redact` configuration.
 */
export function createRedact({ redact }: ILoggerOptions): redactOptions {
  return {
    ...redact,
    paths: [...DEFAULT_REDACT_PATHS, ...(redact?.paths ?? [])],
  };
}
