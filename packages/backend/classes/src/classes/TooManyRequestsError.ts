import type { TErrorPayload } from '../types/index.js';
import { AppError } from './AppError.js';

export class TooManyRequestsError extends AppError {
  constructor(message = 'Too many requests.', payload: TErrorPayload = {}) {
    super({ message, code: 'TOO_MANY_REQUESTS', ...payload });
  }
}