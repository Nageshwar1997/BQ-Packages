import type { TErrorPayload } from '../types/index.js';
import { AppError } from './AppError.js';

export class GatewayTimeoutError extends AppError {
  constructor(message = 'Gateway timeout.', payload: TErrorPayload = {}) {
    super({ message, code: 'GATEWAY_TIMEOUT', ...payload });
  }
}