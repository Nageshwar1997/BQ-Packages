import type { TErrorPayload } from '../types/index.js';
import { AppError } from './AppError.js';

export class BadRequestError extends AppError {
  constructor(message = 'Bad request.', payload: TErrorPayload = {}) {
    super({ message, code: 'BAD_REQUEST', ...payload });
  }
}
