import { stdSerializers } from 'pino';

import type { IErrorSerializerOptions, ISerializedError } from '../types/index.js';

export function serializeError(error: unknown, options: IErrorSerializerOptions): ISerializedError {
  const { includeStack } = options;

  const serialized = stdSerializers.err(
    error instanceof Error ? error : new Error(String(error)),
  ) as ISerializedError;

  if (error instanceof Error && error.cause !== undefined) {
    serialized.cause = serializeError(error.cause, options);
  }

  if (!includeStack) {
    const { stack: _, ...rest } = serialized;

    return rest;
  }

  return serialized;
}
