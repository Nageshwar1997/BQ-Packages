import type { IErrorSerializerOptions, ISerializedError } from '../types/index.js';
import { serializeError } from './serialize-error.js';

/**
 * Creates a Pino-compatible error serializer.
 *
 * Thin factory around `serializeError` so both `createLogger` (for the
 * `err` field passed to `logger.error({ err }, ...)`) and `createHttpLogger`
 * (for uncaught request-handling errors) share the exact same
 * serialization behaviour, configured independently for each.
 *
 * @param options - `includeStack` controls whether stack traces are kept.
 * @returns A serializer function usable as Pino's `serializers.err`.
 */
export function createErrorSerializer(options: IErrorSerializerOptions) {
  return (error: unknown): ISerializedError => {
    return serializeError(error, options);
  };
}
