import type { IRequest, IRequestSerializerOptions, ISerializedRequest } from '../types/index.js';

export function createRequestSerializer({ includeBody }: IRequestSerializerOptions) {
  return (request: IRequest): ISerializedRequest => {
    const serialized: ISerializedRequest = {
      id: request.id,
      method: request.method,
      url: request.originalUrl ?? request.url,
      query: request.query,
      params: request.params,
      ip: request.ip,
      remoteAddress: request.socket.remoteAddress,
      remotePort: request.socket.remotePort,
      userAgent:
        typeof request.headers['user-agent'] === 'string'
          ? request.headers['user-agent']
          : undefined,
      body: includeBody ? request.body : undefined,
    };

    return serialized;
  };
}
