import type { TErrorPayload } from '../types/index.js';
import { AppError } from './AppError.js';

export class UnsupportedMediaTypeError extends AppError {
  constructor(message = 'Unsupported media type.', payload: TErrorPayload = {}) {
    super({ message, code: 'UNSUPPORTED_MEDIA_TYPE', ...payload });
  }
}