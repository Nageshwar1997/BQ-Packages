import { pinoHttp } from 'pino-http';

import type { THttpLoggerOptions } from '../types/index.js';
import { generateRequestId } from './gen-request-id.js';

export function createHttpLogger({ logger, ...options }: THttpLoggerOptions) {
  return pinoHttp({
    ...options,
    logger,
    genReqId: generateRequestId,
  });
}
