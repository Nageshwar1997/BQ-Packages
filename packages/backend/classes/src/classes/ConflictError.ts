import type { TErrorPayload } from '../types/index.js';
import { AppError } from './AppError.js';

export class ConflictError extends AppError {
  constructor(message = 'Resource conflict.', payload: TErrorPayload = {}) {
    super({ message, code: 'CONFLICT', ...payload });
  }
}