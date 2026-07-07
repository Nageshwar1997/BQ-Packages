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
    customProps: (req, _res) => ({ requestId: req.id }),
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

    customReceivedObject: (request) => {
      return {
        requestId: request.id,
      };
    },

    customSuccessObject: (request) => {
      return {
        requestId: request.id,
      };
    },

    customErrorObject: (request, _response, error) => {
      return {
        requestId: request.id,
        error,
      };
    },
  });
}
