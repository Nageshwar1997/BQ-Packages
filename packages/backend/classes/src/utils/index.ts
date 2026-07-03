import { type AppError, ErrorBuilder } from '../classes/index.js';
import { ERROR_CLASS_MAP } from '../constants/index.js';
import type { TCreateErrorOptions } from '../types/index.js';

/**
 * Creates the appropriate AppError instance from an ErrorBuilder
 * or an already built error payload.
 */
export function createError({ message, payload }: TCreateErrorOptions): AppError {
  const errorPayload = payload instanceof ErrorBuilder ? payload.build() : payload;

  const ErrorClass = ERROR_CLASS_MAP[errorPayload.code ?? 'INTERNAL_SERVER_ERROR'];

  return new ErrorClass(message, errorPayload);
}
