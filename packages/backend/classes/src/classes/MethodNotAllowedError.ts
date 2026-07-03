import type { TErrorPayload } from '../types/index.js';
import { AppError } from './AppError.js';

export class MethodNotAllowedError extends AppError {
  constructor(message = 'Method not allowed.', payload: TErrorPayload = {}) {
    super({ message, code: 'METHOD_NOT_ALLOWED', ...payload });
  }
}