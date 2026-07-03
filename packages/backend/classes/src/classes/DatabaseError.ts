import type { TErrorPayload } from '../types/index.js';
import { AppError } from './AppError.js';

export class DatabaseError extends AppError {
  constructor(message = 'Database operation failed.', payload: TErrorPayload = {}) {
    super({ message, code: 'INTERNAL_SERVER_ERROR', ...payload });
  }
}
