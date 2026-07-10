/**
 * Thrown when `JobProducer` or `JobWorker` are constructed with invalid or
 * missing configuration (e.g. no Redis `connection`), or when a `JobWorker`
 * receives a job whose name has no matching entry in its `handlers` map.
 *
 * Distinct from Redis/BullMQ's own runtime errors - this represents a
 * misuse of this package's public API, surfaced eagerly (a system boundary)
 * instead of failing confusingly later inside a job processor.
 */
export class JobQueueConfigurationError extends Error {
  constructor(message: string) {
    super(message);

    this.name = 'JobQueueConfigurationError';

    // Omit this constructor frame from the stack trace (V8).
    Error.captureStackTrace(this, JobQueueConfigurationError);
  }
}
