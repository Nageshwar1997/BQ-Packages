import type { TErrorPayload } from '../types/index.js';
import { AppError } from './AppError.js';

export class ConfigurationError extends AppError {
  constructor(message = 'Server configuration error.', payload: TErrorPayload = {}) {
    super({ message, code: 'INTERNAL_SERVER_ERROR', ...payload });
  }
}
