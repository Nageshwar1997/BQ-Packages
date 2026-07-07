import pino, { type Logger } from 'pino';

import { createBase } from '../configs/base.js';
import { createRedact } from '../configs/redact.js';
import { DEFAULT_LOG_LEVEL } from '../constants/index.js';
import { LoggerConfigurationError } from '../errors/index.js';
import { createErrorSerializer } from '../serializers/error.js';
import { resolveDestination } from '../transports/index.js';
import type { ILoggerOptions } from '../types/index.js';
import { resolvePretty } from '../utils/index.js';

/**
 * Creates the core application logger.
 *
 * This is the single entry point for producing a configured Pino instance
 * across every runtime this package targets - CLIs, workers, cron jobs,
 * background queues, and HTTP servers alike. It wires together, from a
 * minimal set of options:
 *
 *  - base bindings (`service` + `context`) - see `createBase`.
 *  - secure-by-default redaction - see `createRedact`.
 *  - a development pretty-print destination, raw JSON `stdout` in
 *    production, and optionally file-based logging - see `resolveDestination`.
 *  - a recursive, circular-safe error serializer - see `createErrorSerializer`.
 *
 * `pretty`, `service`, `context`, `redact` and `logsDir` are consumed here
 * and never forwarded to Pino directly; everything else in `options` is
 * passed through untouched, so any native Pino option keeps working.
 *
 * @example
 * ```ts
 * const logger = createLogger({ service: 'gateway', pretty: true });
 * logger.info('Server started');
 * logger.error({ err }, 'Failed to process request');
 * ```
 *
 * @param options - Logger configuration. `service` is required.
 * @throws {LoggerConfigurationError} If `service` is missing or blank.
 * @returns A configured Pino `Logger` instance.
 */
export function createLogger(options: ILoggerOptions): Logger {
  // `service` is typed as required, but this guard still matters for plain
  // JS/loosely-typed consumers calling across this public API boundary.
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  if (!options.service?.trim()) {
    throw new LoggerConfigurationError(
      'createLogger requires a non-empty "service" name to tag log output.',
    );
  }

  const {
    context: _context,
    redact: _redact,
    service: _service,
    logsDir,
    ...pinoOptions
  } = options;

  const pretty = resolvePretty(options.pretty);

  return pino(
    {
      level: DEFAULT_LOG_LEVEL,
      ...pinoOptions,
      base: createBase(options),
      redact: createRedact(options),
      serializers: {
        ...pinoOptions.serializers,
        err: createErrorSerializer({
          includeStack: pretty,
        }),
      },
    },
    resolveDestination({ pretty, logsDir }),
  );
}
