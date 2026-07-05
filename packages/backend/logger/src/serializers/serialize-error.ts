import { stdSerializers } from 'pino';

import type { IErrorSerializerOptions, ISerializedError } from '../types/index.js';

export function serializeError(
  error: unknown,
  { includeStack }: IErrorSerializerOptions,
): ISerializedError {
  const serialized = stdSerializers.err(error instanceof Error ? error : new Error(String(error)));

  if (!includeStack) {
    const { stack: _, ...rest } = serialized;

    return rest;
  }

  return serialized;
}
