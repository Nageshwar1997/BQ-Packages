import type { TErrorPayload } from '../types/index.js';
import { AppError } from './AppError.js';

export class AuthenticationError extends AppError {
  constructor(message = 'Authentication failed.', payload: TErrorPayload = {}) {
    super({ message, code: 'AUTHENTICATION_ERROR', ...payload });
  }
}
