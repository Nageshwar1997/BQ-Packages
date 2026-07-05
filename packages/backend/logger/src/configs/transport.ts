import type { LoggerOptions } from '../types/index.js';

export const createTransport = (pretty: LoggerOptions['pretty'] = false) => {
  if (pretty) {
    return {
      target: 'pino-pretty',
    };
  }

  return undefined;
};
