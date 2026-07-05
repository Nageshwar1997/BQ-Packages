import type { Bindings } from 'pino';

import type { ILoggerOptions } from '../types/index.js';

export function createBase({ context, service }: ILoggerOptions): Bindings {
  return { service, ...context };
}
