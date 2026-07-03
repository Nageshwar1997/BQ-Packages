import type { TErrorPayload } from '../types/index.js';
import { AppError } from './AppError.js';

export class ServiceUnavailableError extends AppError {
  constructor(message = 'Service unavailable.', payload: TErrorPayload = {}) {
    super({ message, code: 'SERVICE_UNAVAILABLE', ...payload });
  }
}