import type { IResponse, ISerializedResponse } from '../types/index.js';

/**
 * Creates a Pino-compatible response serializer.
 *
 * Intentionally minimal: only `statusCode` is logged. Response bodies and
 * headers add volume without meaningfully aiding debugging beyond what the
 * status code, paired with the request log for the same `requestId`,
 * already provides.
 *
 * @returns A serializer function usable as Pino's `serializers.res`.
 */
export function createResponseSerializer() {
  return (response: IResponse): ISerializedResponse => ({
    statusCode: response.statusCode,
  });
}
