import type { TErrorPayload } from '../types/index.js';
import { AppError } from './AppError.js';

export class NotImplementedError extends AppError {
  constructor(message = 'Not implemented.', payload: TErrorPayload = {}) {
    super({ message, code: 'NOT_IMPLEMENTED', ...payload });
  }
}