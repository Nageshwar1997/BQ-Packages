import pino from 'pino';

import { createBase } from '../configs/base.js';
import { createRedact } from '../configs/redact.js';
import { createTransport } from '../configs/transport.js';
import type { ILoggerOptions } from '../types/index.js';

export function createLogger(options: ILoggerOptions) {
  const { context: _, redact: __, service: ___, ...pinoOptions } = options;

  return pino({
    ...pinoOptions,
    base: createBase(options),
    redact: createRedact(options),
    transport: createTransport(options.pretty),
  });
}
