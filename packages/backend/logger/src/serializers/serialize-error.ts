import { stdSerializers } from 'pino';

import type { IErrorSerializerOptions, ISerializedError } from '../types/index.js';
import { normalizeError } from './normalize-error.js';

/**
 * Recursively serializes an error (and its `cause` chain / `AggregateError`
 * members) into a plain, JSON-safe object.
 *
 * Never throws: any value can be passed in (see `normalizeError`), and the
 * `visited` `WeakSet` guarantees termination even if `cause`/`errors` form
 * a cycle (e.g. `a.cause = b; b.cause = a`) - a cycle member reached a
 * second time is serialized as just `{ type, message }` instead of being
 * followed again.
 *
 * @param error - The value to serialize. May be an `Error`, `AggregateError`, or any unknown value.
 * @param options - `includeStack` controls whether `stack` is kept (development) or stripped (production).
 * @param visited - Internal recursion guard; callers should not pass this.
 * @returns A serialized, JSON-safe representation of `error`.
 */
export function serializeError(
  error: unknown,
  options: IErrorSerializerOptions,
  visited = new WeakSet<Error>(),
): ISerializedError {
  const { includeStack } = options;

  const normalizedError = normalizeError(error);

  // Cycle guard: if we've already serialized this exact error object further
  // up the `cause`/`errors` chain, stop here instead of recursing forever.
  if (visited.has(normalizedError)) {
    return { type: normalizedError.name, message: normalizedError.message };
  }

  visited.add(normalizedError);

  // Reuse Pino's own battle-tested error serializer for the base shape
  // (type, message, stack) instead of re-implementing it.
  const serialized = stdSerializers.err(normalizedError) as ISerializedError;

  if (normalizedError instanceof AggregateError) {
    serialized.errors = normalizedError.errors.map((error) =>
      serializeError(error, options, visited),
    );
  }

  if (normalizedError.cause !== undefined) {
    serialized.cause = serializeError(normalizedError.cause, options, visited);
  }

  if (!includeStack) {
    const { stack: _, ...rest } = serialized;

    return rest;
  }

  return serialized;
}
