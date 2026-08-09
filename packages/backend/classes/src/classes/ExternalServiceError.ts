import type { TErrorPayload } from '../types/index.js';
import { AppError } from './AppError.js';

export class ExternalServiceError extends AppError {
  constructor(message = 'External service error.', payload: TErrorPayload = {}) {
    super({ message, code: 'SERVICE_UNAVAILABLE', ...payload });
  }
}
