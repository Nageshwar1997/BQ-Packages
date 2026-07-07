import { pinoHttp } from 'pino-http';

import { DEFAULT_IGNORE_PATHS } from '../constants/index.js';
import type { IHttpLoggerOptions } from '../types/index.js';
import { customSuccessMessage } from './custom-success-message.js';
import { generateRequestId } from './gen-request-id.js';

export function createHttpLogger({ logger, ...options }: IHttpLoggerOptions) {
  const ignorePaths = new Set([...DEFAULT_IGNORE_PATHS, ...(options.ignorePaths ?? [])]);
  return pinoHttp({
    ...options,
    autoLogging: {
      ignore: (request) => {
        const url = request.url ?? '';

        return [...ignorePaths].some((path) => url.startsWith(path));
      },
    },
    logger,
    genReqId: generateRequestId,
    customSuccessMessage: customSuccessMessage,
    customLogLevel: (_request, response, error) => {
      if (error || response.statusCode >= 500) {
        return 'error';
      }

      if (response.statusCode >= 400) {
        return 'warn';
      }

      return 'info';
    },
  });
}
