import type { IncomingMessage } from 'node:http';

import type { Logger, LoggerOptions, redactOptions, SerializedError } from 'pino';

export interface ILoggerOptions extends Omit<
  LoggerOptions,
  'base' | 'name' | 'transport' | 'redact'
> {
  /** Name of the service emitting logs. */
  service: string;

  /**
   * Enable pretty logging.
   *
   * @default process.env.IS_DEV === 'true'
   */
  pretty?: boolean;

  /** Additional fields included in every log. */
  context?: Record<string, unknown>;

  /** Additional redact paths merged with the default redact paths. */
  redact?: Omit<redactOptions, 'paths'> & { paths?: string[] };
}

export interface IRequestLoggerOptions {
  logger: Logger;
  ignorePaths?: string[];
}

export interface ISerializedError extends Omit<SerializedError, 'cause'> {
  cause?: ISerializedError;
  errors?: ISerializedError[];
}

export interface IErrorSerializerOptions {
  includeStack: boolean;
}

export interface IRequestSerializerOptions {
  includeBody: boolean;
}

export interface ISerializedRequest extends Pick<IncomingMessage, 'method' | 'url'> {
  id?: string;
  query?: unknown;
  params?: unknown;
  ip?: string;
  remoteAddress?: string;
  userAgent?: string;
  body?: unknown;
}
