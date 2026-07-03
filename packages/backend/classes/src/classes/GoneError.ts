import type { TErrorPayload } from '../types/index.js';
import { AppError } from './AppError.js';

export class GoneError extends AppError {
  constructor(message = 'Resource is no longer available.', payload: TErrorPayload = {}) {
    super({ message, code: 'GONE', ...payload });
  }
}