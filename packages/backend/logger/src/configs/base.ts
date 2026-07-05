import type { Bindings } from 'pino';

import type { LoggerOptions } from '../types/index.js';

export function createBase({ context, service }: LoggerOptions): Bindings {
  return { service, ...context };
}
