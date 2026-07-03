import type { TErrorPayload } from '../types/index.js';
import { AppError } from './AppError.js';

export class InternalServerError extends AppError {
  constructor(message = 'Internal server error.', payload: TErrorPayload = {}) {
    super({ message, code: 'INTERNAL_SERVER_ERROR', ...payload });
  }
}