import type { Logger, LoggerOptions, redactOptions, SerializedError } from 'pino';
import type { Options as HttpLoggerOptions, StdSerializedResults } from 'pino-http';

/**
 * Options accepted by `createLogger`.
 *
 * This intentionally extends Pino's own `LoggerOptions` (via `Omit`) rather
 * than re-declaring Pino's surface, so that:
 *  - every native Pino option (`level`, `formatters`, `hooks`, `timestamp`, ...)
 *    keeps working without this package needing to know about it, and
 *  - upgrading the `pino` dependency automatically picks up new options
 *    without a breaking change here.
 *
 * `base`, `name`, `transport` and `redact` are omitted because this package
 * derives them itself (from `service`/`context`, `pretty` and `redact`
 * respectively) to guarantee the secure/consistent defaults described in
 * the package README.
 */
export interface ILoggerOptions
  extends Omit<LoggerOptions, 'base' | 'name' | 'transport' | 'redact'> {
  /**
   * Name of the service emitting logs (e.g. `"gateway"`, `"orders-worker"`).
   *
   * Included on every log line via the base bindings so that a single
   * Loki/Grafana instance aggregating logs from many microservices can
   * filter/group by service.
   */
  service: string;

  /**
   * Enable human-readable, colorized development output (via `pino-pretty`)
   * instead of raw JSON.
   *
   * Also controls other development-only behaviour driven by this package
   * (e.g. whether stack traces and request bodies are included in logs),
   * so environment-dependent behaviour is decided in one place instead of
   * scattered `process.env.NODE_ENV` checks.
   *
   * @default process.env.IS_DEV === 'true'
   */
  pretty?: boolean;

  /** Additional static fields included in every log line emitted by this logger. */
  context?: Record<string, unknown>;

  /**
   * Additional redaction paths, merged with {@link DEFAULT_REDACT_PATHS}.
   *
   * The default paths can never be removed this way - only extended - so
   * that misconfiguration in a single service can't accidentally disable
   * the package's baseline secure defaults.
   */
  redact?: Omit<redactOptions, 'paths'> & { paths?: string[] };
}

/**
 * Options accepted by the error serializer factory (`createErrorSerializer`)
 * and, transitively, by `serializeError`.
 */
export interface IErrorSerializerOptions {
  /**
   * Whether to include the `stack` property on serialized errors.
   *
   * Stack traces are invaluable in development but should be omitted in
   * production logs: they are verbose (increasing Loki ingestion volume),
   * can leak internal file paths/module layout, and are rarely actionable
   * once already deployed and monitored via metrics/tracing instead.
   */
  includeStack: boolean;
}

/**
 * A serialized error, safe to pass to `JSON.stringify`/pass to Pino.
 *
 * Extends Pino's own `SerializedError` so downstream tooling that already
 * understands Pino's shape keeps working, while adding support for
 * recursively-serialized `cause` chains and `AggregateError.errors`.
 */
export interface ISerializedError extends Omit<SerializedError, 'cause'> {
  /** Serialized `Error.cause`, if the original error had one. */
  cause?: ISerializedError;
  /** Serialized `AggregateError.errors`, if the original error was an `AggregateError`. */
  errors?: ISerializedError[];
}

/** Options accepted by the request serializer factory (`createRequestSerializer`). */
export interface IRequestSerializerOptions {
  /**
   * Whether to include the parsed request body in the serialized output.
   *
   * Request bodies frequently contain sensitive or bulky data (passwords,
   * file uploads, large payloads) and are therefore only ever logged in
   * development, and never by default.
   */
  includeBody: boolean;
}

/** The shape Pino's built-in request serializer produces. Reused instead of re-declared. */
type SerializedRequest = StdSerializedResults['req'];

/**
 * Minimal, framework-agnostic shape this package needs from an incoming
 * HTTP request in order to serialize it.
 *
 * Deliberately duck-typed instead of importing Express's `Request` type:
 * `query`/`params`/`originalUrl` are optional because they only exist when
 * the underlying framework (e.g. Express) augments the raw Node
 * `IncomingMessage`. This keeps the serializer usable with Fastify, plain
 * `node:http`, or any other framework that provides at least these fields.
 */
export interface IRequest extends Pick<SerializedRequest, 'method' | 'url' | 'id'> {
  query?: Record<string, unknown>;
  params?: Record<string, unknown>;
  headers: Record<string, string | string[] | undefined>;
  originalUrl?: string;
  ip?: string;
  body?: unknown;
  socket?: Partial<Pick<SerializedRequest, 'remoteAddress' | 'remotePort'>>;
}

/**
 * Output of the request serializer.
 *
 * Headers are intentionally NOT part of this shape (see
 * {@link DEFAULT_REDACT_PATHS} and the package README "Security" section) -
 * only the single derived `userAgent` field is surfaced, since it is
 * useful for debugging and carries no sensitive information.
 */
export interface ISerializedRequest
  extends Pick<SerializedRequest, 'id' | 'method' | 'url'>,
    Pick<IRequest, 'query' | 'params' | 'ip'>,
    Pick<NonNullable<IRequest['socket']>, 'remoteAddress' | 'remotePort'> {
  /** Value of the `User-Agent` header, if present. */
  userAgent?: string;
  /** Parsed request body. Development only - see {@link IRequestSerializerOptions.includeBody}. */
  body?: unknown;
}

/** The shape Pino's built-in response serializer produces. Reused instead of re-declared. */
type SerializedResponse = StdSerializedResults['res'];

/** Minimal, framework-agnostic shape this package needs from an outgoing HTTP response. */
export type IResponse = Pick<SerializedResponse, 'statusCode'>;

/**
 * Output of the response serializer.
 *
 * Deliberately minimal (status code only) - response bodies/headers are
 * not logged, since they add volume without meaningfully aiding
 * debugging beyond what the status code and request log already provide.
 */
export type ISerializedResponse = Pick<SerializedResponse, 'statusCode'>;

/**
 * Options accepted by `createHttpLogger`.
 *
 * Extends `pino-http`'s own `Options` type so every native `pino-http`
 * option keeps working. A few keys are intentionally omitted because this
 * package controls them to guarantee consistent, secure behaviour across
 * every service that uses it:
 *
 *  - `serializers` - always our own req/res/err serializers (secure defaults).
 *  - `genReqId` - always reuses `x-request-id` or generates a UUID.
 *  - `customLogLevel` - always the 2xx/3xx→info, 4xx→warn, 5xx→error mapping.
 *  - `customSuccessMessage` - always the same message shape, so log
 *    messages stay consistent (and therefore easy to query) across services.
 *  - `logger` - re-declared below as *required*, since the HTTP logger must
 *    always be backed by an explicit Pino instance (see package README).
 *  - `wrapSerializers` - always `false`. `pino-http` otherwise pre-serializes
 *    req/res/err with its own built-in serializers before ours ever run,
 *    which silently corrupts our error serializer's `instanceof Error`
 *    checks and drops `remoteAddress`/`remotePort` from the request serializer.
 *
 * `customProps`, `customReceivedObject`, `customSuccessObject` and
 * `customErrorObject` are intentionally left available: a consumer-supplied
 * function is merged with (not replacing) this package's defaults - see
 * `createHttpLogger`.
 */
export interface IHttpLoggerOptions
  extends Omit<
    HttpLoggerOptions,
    | 'serializers'
    | 'genReqId'
    | 'customLogLevel'
    | 'customSuccessMessage'
    | 'logger'
    | 'wrapSerializers'
  > {
  /** The Pino logger instance the HTTP logger will attach child loggers to. */
  logger: Logger;

  /**
   * Additional request paths to ignore, merged with
   * {@link DEFAULT_IGNORE_PATHS}.
   */
  ignorePaths?: string[];

  /**
   * Enable development-only behaviour for this HTTP logger (currently:
   * including the request body).
   *
   * Independent from the core logger's own `pretty` option - the HTTP
   * logger stays decoupled from `createLogger`'s configuration while still
   * sharing the same underlying Pino instance.
   *
   * @default process.env.IS_DEV === 'true'
   */
  pretty?: boolean;
}

/** Reuses `pino-http`'s own type for the success message hook instead of re-declaring it. */
export type TCustomSuccessMessage = NonNullable<HttpLoggerOptions['customSuccessMessage']>;

/** Reuses `pino-http`'s own type for the error message hook instead of re-declaring it. */
export type TCustomErrorMessage = NonNullable<HttpLoggerOptions['customErrorMessage']>;

/** Reuses `pino-http`'s own type for the log-level hook instead of re-declaring it. */
export type TCustomLogLevel = NonNullable<HttpLoggerOptions['customLogLevel']>;
