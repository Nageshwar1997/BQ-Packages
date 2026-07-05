import type { IResponse, ISerializedResponse } from '../types/index.js';

export function createResponseSerializer() {
  return (response: IResponse): ISerializedResponse => ({
    statusCode: response.statusCode,
  });
}
