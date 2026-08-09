import type { TErrorPayload } from '../types/index.js';
import { AppError } from './AppError.js';

export class UnknownError extends AppError {
  constructor(message = 'An unexpected error occurred.', payload: TErrorPayload = {}) {
    super({ message, code: 'INTERNAL_SERVER_ERROR', isOperational: false, ...payload });
  }
}
