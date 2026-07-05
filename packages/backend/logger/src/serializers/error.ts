import type { ISerializedError } from '../types/index.js';

export function createErrorSerializer() {
  return (_error: Error): ISerializedError => {
    throw new Error('Not implemented');
  };
}
