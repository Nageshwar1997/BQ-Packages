import type { ILoggerOptions } from '../types/index.js';

export const createTransport = (pretty: ILoggerOptions['pretty'] = false) => {
  if (!pretty) {
    return undefined;
  }

  return { target: 'pino-pretty' };
};
