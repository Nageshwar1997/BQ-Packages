/**
 * Thrown when `createLogger` or `createHttpLogger` are called with invalid
 * or missing configuration (e.g. an empty `service` name, or no `logger`
 * instance).
 *
 * Distinct from the error *serialization* utilities in `serializers/` -
 * this class represents a misuse of this package's own public API,
 * surfaced eagerly at setup time (a system boundary) rather than silently
 * producing a misconfigured logger that fails confusingly later.
 */
export class LoggerConfigurationError extends Error {
  constructor(message: string) {
    super(message);

    this.name = 'LoggerConfigurationError';

    // Omit this constructor frame from the stack trace (V8).
    Error.captureStackTrace(this, LoggerConfigurationError);
  }
}
