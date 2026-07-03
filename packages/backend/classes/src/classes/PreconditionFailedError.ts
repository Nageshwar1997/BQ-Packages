import type { TErrorPayload } from '../types/index.js';
import { AppError } from './AppError.js';

export class PreconditionFailedError extends AppError {
  constructor(message = 'Precondition failed.', payload: TErrorPayload = {}) {
    super({ message, code: 'PRECONDITION_FAILED', ...payload });
  }
}
