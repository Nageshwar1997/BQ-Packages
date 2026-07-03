import { ERROR_CLASS_MAP } from '../constants/index.js';
import type { IErrorBuilderResult } from '../types/index.js';
import type { AppError } from './AppError.js';
import { ErrorBuilder } from './ErrorBuilder.js';

interface TCreateErrorOptions {
  message: string;
  payload: ErrorBuilder | IErrorBuilderResult;
}

/**
 * Creates the appropriate AppError instance from an ErrorBuilder
 * or an already built error payload.
 */
export function createError({ message, payload }: TCreateErrorOptions): AppError {
  const errorPayload = payload instanceof ErrorBuilder ? payload.build() : payload;

  const ErrorClass = ERROR_CLASS_MAP[errorPayload.code ?? 'INTERNAL_SERVER_ERROR'];

  return new ErrorClass(message, errorPayload);
}
