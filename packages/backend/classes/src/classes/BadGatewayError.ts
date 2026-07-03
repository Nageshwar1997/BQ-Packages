import type { TErrorPayload } from '../types/index.js';
import { AppError } from './AppError.js';

export class BadGatewayError extends AppError {
  constructor(message = 'Bad gateway.', payload: TErrorPayload = {}) {
    super({ message, code: 'BAD_GATEWAY', ...payload });
  }
}