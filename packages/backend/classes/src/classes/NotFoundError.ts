import type { TErrorPayload } from '../types/index.js';
import { AppError } from './AppError.js';

export class NotFoundError extends AppError {
  constructor(message = 'Resource not found.', payload: TErrorPayload = {}) {
    super({ message, code: 'NOT_FOUND', ...payload });
  }
}
