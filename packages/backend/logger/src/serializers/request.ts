import type { IRequest, IRequestSerializerOptions, ISerializedRequest } from '../types/index.js';

/**
 * Creates a Pino-compatible request serializer.
 *
 * Deliberately framework-agnostic: it reads only the duck-typed `IRequest`
 * shape (populated by Express, Fastify-with-adapter, or manually), never
 * an Express `Request` type directly. Raw `headers` are never included in
 * the output - only the derived, non-sensitive `userAgent` - since headers
 * routinely carry authorization/cookie material that must never reach logs
 * even if redaction is somehow bypassed upstream.
 *
 * @param options - `includeBody` gates whether the parsed request body is
 * included; this should only ever be enabled in development (see
 * `resolvePretty`), since bodies can contain sensitive or bulky data.
 * @returns A serializer function usable as Pino's `serializers.req`.
 */
export function createRequestSerializer({ includeBody }: IRequestSerializerOptions) {
  return (request: IRequest): ISerializedRequest => {
    const serialized: ISerializedRequest = {
      id: request.id,
      method: request.method,
      url: request.originalUrl ?? request.url,
      query: request.query,
      params: request.params,
      ip: request.ip,
      remoteAddress: request.socket?.remoteAddress,
      remotePort: request.socket?.remotePort,
      ...(typeof request.headers['user-agent'] === 'string' && {
        userAgent: request.headers['user-agent'],
      }),
      ...(includeBody && { body: request.body }),
    };

    return serialized;
  };
}
