import type { redactOptions } from 'pino';

import { DEFAULT_REDACT_PATHS } from '../constants/index.js';
import type { LoggerOptions } from '../types/index.js';

export function createRedact({ redact }: LoggerOptions): redactOptions {
  return {
    ...redact,
    paths: [...DEFAULT_REDACT_PATHS, ...(redact?.paths ?? [])],
  };
}
