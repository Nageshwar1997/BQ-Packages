import { stdSerializers } from 'pino';

import type { IErrorSerializerOptions, ISerializedError } from '../types/index.js';

export function serializeError(
  error: unknown,
  options: IErrorSerializerOptions,
  visited = new WeakSet<Error>(),
): ISerializedError {
  const { includeStack } = options;

  if (error instanceof Error) {
    if (visited.has(error)) {
      return { type: error.name, message: error.message };
    }

    visited.add(error);
  }

  const serialized = stdSerializers.err(
    error instanceof Error ? error : new Error(String(error)),
  ) as ISerializedError;

  if (error instanceof Error && error.cause !== undefined) {
    serialized.cause = serializeError(error.cause, options, visited);
  }

  if (!includeStack) {
    const { stack: _, ...rest } = serialized;

    return rest;
  }

  return serialized;
}
