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
}

export interface IErrorSerializerOptions {
  includeStack: boolean;
}
