import type { TErrorPayload } from '../types/index.js';
import { AppError } from './AppError.js';

export class UnprocessableEntityError extends AppError {
  constructor(message = 'Unprocessable entity.', payload: TErrorPayload = {}) {
    super({ message, code: 'UNPROCESSABLE_ENTITY', ...payload });
  }
}
