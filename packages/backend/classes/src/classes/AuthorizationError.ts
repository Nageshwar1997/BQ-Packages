import type { TErrorPayload } from '../types/index.js';
import { AppError } from './AppError.js';

export class AuthorizationError extends AppError {
  constructor(message = 'Access denied.', payload: TErrorPayload = {}) {
    super({ message, code: 'AUTHORIZATION_ERROR', ...payload });
  }
}
