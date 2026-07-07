import type { IRequest, IRequestSerializerOptions, ISerializedRequest } from '../types/index.js';

export function createRequestSerializer({ includeBody }: IRequestSerializerOptions) {
  return (request: IRequest): ISerializedRequest => {
    console.log("🚀 ~ createRequestSerializer ~ request, { depth: null }:", request, { depth: null })
    console.log("🚀 ~ createRequestSerializer ~ request:", request.socket)
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
