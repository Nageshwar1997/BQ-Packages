import type { TErrorPayload } from '../types/index.js';
import { AppError } from './AppError.js';

export class RequestTimeoutError extends AppError {
  constructor(message = 'Request timed out.', payload: TErrorPayload = {}) {
    super({ message, code: 'REQUEST_TIMEOUT', ...payload });
  }
}