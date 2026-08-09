import type { Level } from 'pino';

/**
 * Default Pino log level applied when a consumer does not supply one.
 *
 * Kept centralized so the "default behaviour" of every logger created by
 * this package is controlled from a single place instead of being repeated
 * (and potentially drifting) across `core` and `http`.
 */
export const DEFAULT_LOG_LEVEL: Level = 'info';

/**
 * Field names that must never reach a log line unredacted, wherever they
 * appear in a logged object.
 */
const SENSITIVE_FIELD_NAMES = [
  'password',
  'confirmPassword',
  'token',
  'accessToken',
  'refreshToken',
] as const;

/**
 * Object-path prefixes under which a request body commonly ends up nested
 * when logged - either passed directly to the core logger
 * (`logger.info({ body })`, nesting under `body`), or via the HTTP
 * logger's serialized request shape (nesting under `req.body`). The empty
 * prefix covers the field appearing at the top level of a log object.
 */
const SENSITIVE_FIELD_PATH_PREFIXES = ['', 'body', 'req.body'] as const;

/**
 * Redaction paths that are ALWAYS applied, regardless of what a consumer
 * configures.
 *
 * These represent the minimum "secure by default" guarantee of the
 * package: no service integrating this logger should ever be able to leak
 * credentials or session material into logs, even by accident - including
 * when a (development-only) request body is logged.
 *
 * Note: Pino's redaction (via `fast-redact`) does not support matching a
 * field name at *any* depth - only exact paths - so every known nesting
 * prefix a sensitive field could realistically appear under is enumerated
 * explicitly instead.
 *
 * Consumers may still add additional paths (see `ILoggerOptions.redact`),
 * but they can never remove these.
 */
export const DEFAULT_REDACT_PATHS: readonly string[] = [
  'req.headers.authorization',
  'req.headers.cookie',
  'req.headers["x-api-key"]',
  ...SENSITIVE_FIELD_PATH_PREFIXES.flatMap((prefix) =>
    SENSITIVE_FIELD_NAMES.map((field) => (prefix ? `${prefix}.${field}` : field)),
  ),
];

/**
 * Request paths that are ignored by the HTTP auto-logger by default.
 *
 * These are high-volume, low-value endpoints (health checks, browser
 * probes) that would otherwise flood log storage - and Loki/Grafana
 * ingestion costs - without providing operational value.
 */
export const DEFAULT_IGNORE_PATHS = ['/health', '/favicon.ico', '/robots.txt'] as const;

/**
 * HTTP status code thresholds used to derive a log level from a response.
 *
 * Centralizing these avoids magic numbers scattered through the HTTP
 * logger and makes the mapping unit-testable in isolation via the
 * `getLogLevelForStatus` utility.
 */
export const HTTP_STATUS_LOG_LEVEL_THRESHOLD = {
  /** Status codes >= this value are logged as `warn` (unless also a server error). */
  CLIENT_ERROR: 400,
  /** Status codes >= this value are logged as `error`. */
  SERVER_ERROR: 500,
} as const;
