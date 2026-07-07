import { type HttpLogger,pinoHttp } from 'pino-http';

import { DEFAULT_IGNORE_PATHS } from '../constants/index.js';
import { LoggerConfigurationError } from '../errors/index.js';
import { createErrorSerializer } from '../serializers/error.js';
import { createRequestSerializer } from '../serializers/request.js';
import { createResponseSerializer } from '../serializers/response.js';
import type { IHttpLoggerOptions } from '../types/index.js';
import { createPathIgnorer, getLogLevelForStatus, resolvePretty } from '../utils/index.js';
import { customSuccessMessage } from './custom-success-message.js';
import { generateRequestId } from './gen-request-id.js';

/**
 * Creates the HTTP request/response logging middleware, backed by
 * `pino-http`.
 *
 * Deliberately independent from `createLogger`: it accepts any Pino
 * `Logger` instance (typically one produced by `createLogger`) via the
 * required `logger` option, so the HTTP logger's own configuration
 * (ignored paths, dev body logging, ...) never leaks into - or depends on -
 * the core application logger's configuration, while both still write
 * through the same underlying Pino instance/transport.
 *
 * A few behaviours are always enforced by this package, for consistency
 * across every service (see `IHttpLoggerOptions` for the full rationale):
 *  - request ID generation/propagation (`x-request-id` reuse, or a new UUID).
 *  - the req/res/err serializers (secure defaults - no raw headers/bodies in production).
 *  - the 2xx/3xx→info, 4xx→warn, 5xx→error log-level mapping.
 *  - the success log message format.
 *
 * Everything else layers additively on top of consumer-supplied options
 * instead of silently discarding them:
 *  - `ignorePaths` are merged with {@link DEFAULT_IGNORE_PATHS}.
 *  - a consumer's own `autoLogging.ignore` (or `autoLogging: false`) is respected.
 *  - `customProps`/`customReceivedObject`/`customSuccessObject`/`customErrorObject`,
 *    if supplied, are merged on top of this package's own output (e.g. `requestId`)
 *    rather than replacing it.
 *
 * @example
 * ```ts
 * const logger = createLogger({ service: 'gateway' });
 * app.use(createHttpLogger({ logger, ignorePaths: ['/metrics'] }));
 * ```
 *
 * @param options - HTTP logger configuration. `logger` is required.
 * @throws {LoggerConfigurationError} If `logger` is not provided.
 * @returns An Express/Connect-compatible middleware function (also usable
 * with any framework that exposes raw `(req, res, next)`).
 */
export function createHttpLogger({
  logger,
  ignorePaths: extraIgnorePaths,
  pretty: prettyOption,
  ...options
}: IHttpLoggerOptions): HttpLogger {
  // `logger` is typed as required, but this guard still matters for plain
  // JS/loosely-typed consumers calling across this public API boundary.
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  if (!logger) {
    throw new LoggerConfigurationError(
      'createHttpLogger requires a "logger" instance (see createLogger) to attach request/response logs to.',
    );
  }

  const pretty = resolvePretty(prettyOption);

  const ignorePaths = new Set([...DEFAULT_IGNORE_PATHS, ...(extraIgnorePaths ?? [])]);
  const isIgnoredByDefault = createPathIgnorer(ignorePaths);

  const userAutoLogging = options.autoLogging;
  const userIgnore = typeof userAutoLogging === 'object' ? userAutoLogging.ignore : undefined;

  return pinoHttp({
    ...options,
    logger,

    // pino-http, by default, pre-serializes req/res/err through its OWN
    // built-in serializers before ever invoking a custom one supplied via
    // `serializers` - so a custom `err` serializer would receive an
    // already-flattened plain object instead of the original `Error`
    // (breaking `instanceof Error` checks, cause chains, etc.), and a
    // custom `req` serializer would receive flat `remoteAddress`/
    // `remotePort` fields instead of the raw `.socket`. Disabling this
    // ensures our serializers below always see the raw, original values.
    wrapSerializers: false,

    // Auto-logging stays enabled unless the consumer explicitly opts out
    // entirely (`autoLogging: false`); otherwise the default ignore list
    // and any consumer-supplied `ignore` predicate are both honoured.
    autoLogging:
      userAutoLogging === false
        ? false
        : {
            ...(typeof userAutoLogging === 'object' ? userAutoLogging : {}),
            ignore: (request) => isIgnoredByDefault(request.url) || (userIgnore?.(request) ?? false),
          },

    genReqId: generateRequestId,
    customSuccessMessage,

    // Injected once, on every request/success/error log line, instead of
    // repeating `requestId` inside each `customXObject` below.
    customProps: (request, response) => ({
      requestId: request.id,
      ...options.customProps?.(request, response),
    }),

    customLogLevel: (_request, response, error) =>
      getLogLevelForStatus(response.statusCode, !!error),

    // Only override pino-http's default object-building hooks when the
    // consumer actually supplied one, and merge on top of pino-http's own
    // accumulated value (`val`) rather than replacing it - this avoids
    // dropping fields pino-http already computed (e.g. `err`) while still
    // layering the consumer's extra structured fields on top.
    ...(options.customReceivedObject && {
      customReceivedObject: (request, response, val) => {
        const merged: Record<string, unknown> = {
          ...(val as Record<string, unknown> | undefined),
          ...(options.customReceivedObject?.(request, response, val) as
            | Record<string, unknown>
            | undefined),
        };

        return merged;
      },
    }),
    ...(options.customSuccessObject && {
      customSuccessObject: (request, response, val) => {
        const merged: Record<string, unknown> = {
          ...(val as Record<string, unknown> | undefined),
          ...(options.customSuccessObject?.(request, response, val) as
            | Record<string, unknown>
            | undefined),
        };

        return merged;
      },
    }),
    ...(options.customErrorObject && {
      customErrorObject: (request, response, error, val) => {
        const merged: Record<string, unknown> = {
          ...(val as Record<string, unknown> | undefined),
          ...(options.customErrorObject?.(request, response, error, val) as
            | Record<string, unknown>
            | undefined),
        };

        return merged;
      },
    }),

    serializers: {
      req: createRequestSerializer({ includeBody: pretty }),
      res: createResponseSerializer(),
      err: createErrorSerializer({ includeStack: pretty }),
    },
  });
}
