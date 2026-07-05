import type { TLoggerOptions } from '../types/index.js';

export const createTransport = (pretty: TLoggerOptions['pretty'] = false) => {
  if (pretty) {
    return {
      target: 'pino-pretty',
    };
  }

  return undefined;
};
