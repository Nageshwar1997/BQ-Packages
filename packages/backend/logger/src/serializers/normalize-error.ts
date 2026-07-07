/**
 * Coerces an arbitrary thrown/rejected value into a real `Error` instance.
 *
 * JavaScript allows `throw` with any value (strings, numbers, plain
 * objects, `undefined`, ...), so this is the boundary that guarantees
 * every downstream serializer only ever has to deal with `Error` objects -
 * "unknown values should automatically become `Error` objects" per the
 * package's error-serializer contract.
 *
 * @param error - Any value caught from a `try`/`catch`, promise rejection, or event.
 * @returns `error` unchanged if it already is an `Error`, otherwise a new
 * `Error` wrapping its string representation.
 */
export function normalizeError(error: unknown): Error {
  if (error instanceof Error) {
    return error;
  }

  return new Error(String(error));
}
