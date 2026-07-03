import type { TErrorPayload } from '../types/index.js';
import { AppError } from './AppError.js';

export class PayloadTooLargeError extends AppError {
  constructor(message = 'Payload too large.', payload: TErrorPayload = {}) {
    super({ message, code: 'PAYLOAD_TOO_LARGE', ...payload });
  }
}