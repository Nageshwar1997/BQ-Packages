import type { Level, Logger } from 'pino';

export interface LoggerOptions {
  service: string;
  level?: Level;
  pretty?: boolean;
  redact?: string[];
}

export interface RequestLoggerOptions {
  logger: Logger;
  ignorePaths?: string[];
}
