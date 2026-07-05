import type { Request } from 'express';

import type { IRequestSerializerOptions, ISerializedRequest } from '../types/index.js';

export function createRequestSerializer({ includeBody }: IRequestSerializerOptions) {
  return ({
    method,
    originalUrl,
    query,
    params,
    ip,
    socket,
    body,
    ...restReq
  }: Request): ISerializedRequest => {
    const serialized: ISerializedRequest = {
      method,
      url: originalUrl,
      query,
      params,
      ip,
      remoteAddress: socket.remoteAddress,
      userAgent: restReq.get('user-agent'),
    };

    if (includeBody) {
      serialized.body = body;
    }

    return serialized;
  };
}
