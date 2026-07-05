import pino from 'pino';

import { createBase } from '../configs/base.js';
import { createRedact } from '../configs/redact.js';
import { createTransport } from '../configs/transport.js';
import { createErrorSerializer } from '../serializers/error.js';
import { createRequestSerializer } from '../serializers/request.js';
import { createResponseSerializer } from '../serializers/response.js';
import type { ILoggerOptions } from '../types/index.js';

export function createLogger(options: ILoggerOptions) {
  const { context: _, redact: __, service: ___, ...pinoOptions } = options;

  return pino({
    ...pinoOptions,
    base: createBase(options),
    redact: createRedact(options),
    transport: createTransport(options.pretty),
    serializers: {
      ...pinoOptions.serializers,
      err: createErrorSerializer({ includeStack: !!options.pretty }),
      req: createRequestSerializer({ includeBody: !!options.pretty }),
      res: createResponseSerializer(),
    },
  });
}
