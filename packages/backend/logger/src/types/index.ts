import type { Logger, LoggerOptions as PinoLoggerOptions, redactOptions } from 'pino';

export interface LoggerOptions extends Omit<
  PinoLoggerOptions,
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

export interface RequestLoggerOptions {
  logger: Logger;
  ignorePaths?: string[];
}
