import type { IErrorSerializerOptions, ISerializedError } from '../types/index.js';
import { serializeError } from './serialize-error.js';

export function createErrorSerializer(options: IErrorSerializerOptions) {
  return (error: unknown): ISerializedError => {
    return serializeError(error, options);
  };
}
