import type { TErrorPayload } from '../types/index.js';
import { AppError } from './AppError.js';

export class ValidationError extends AppError {
  constructor(message = 'Validation failed.', payload: TErrorPayload = {}) {
    super({ message, code: 'VALIDATION_ERROR', ...payload });
  }
}
