import type { Level } from 'pino';

export const DEFAULT_LOG_LEVEL: Level = 'info';

export const DEFAULT_REDACT_PATHS = [
  'req.headers.authorization',
  'req.headers.cookie',
  'req.headers["x-api-key"]',
  'password',
  'confirmPassword',
  'token',
  'accessToken',
  'refreshToken',
] as const;
