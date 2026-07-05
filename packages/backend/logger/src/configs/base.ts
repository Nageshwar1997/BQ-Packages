import type { Bindings } from 'pino';

import type { TLoggerOptions } from '../types/index.js';

export function createBase({ context, service }: TLoggerOptions): Bindings {
  return { service, ...context };
}
