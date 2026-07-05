import { stdSerializers } from 'pino';

import type { IErrorSerializerOptions, ISerializedError } from '../types/index.js';
import { normalizeError } from './normalize-error.js';

export function serializeError(
  error: unknown,
  options: IErrorSerializerOptions,
  visited = new WeakSet<Error>(),
): ISerializedError {
  const { includeStack } = options;

  const normalizedError = normalizeError(error);

  if (visited.has(normalizedError)) {
    return { type: normalizedError.name, message: normalizedError.message };
  }

  visited.add(normalizedError);

  const serialized = stdSerializers.err(normalizedError) as ISerializedError;

  if (normalizedError.cause !== undefined) {
    serialized.cause = serializeError(normalizedError.cause, options, visited);
  }

  if (!includeStack) {
    const { stack: _, ...rest } = serialized;

    return rest;
  }

  return serialized;
}
