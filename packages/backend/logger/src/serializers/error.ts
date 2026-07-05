import type { TSerializedError } from '../types/index.js';

export function createErrorSerializer() {
  return (_error: Error): TSerializedError => {
    throw new Error('Not implemented');
  };
}
