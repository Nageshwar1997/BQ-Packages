import type { Logger, LoggerOptions, redactOptions, SerializedError } from 'pino';
import type { StdSerializedResults } from 'pino-http';

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

type SerializedRequest = StdSerializedResults['req'];

export interface IRequest extends Pick<
  SerializedRequest,
  'method' | 'url' | 'id' | 'query' | 'params' | 'headers'
> {
  originalUrl?: string;
  ip?: string;
  body?: unknown;
  socket: Pick<SerializedRequest, 'remoteAddress' | 'remotePort'>;
}

export interface ISerializedRequest extends Omit<SerializedRequest, 'raw' | 'headers'> {
  ip?: string; // Client IP address.
  userAgent?: string; //User-Agent header.
  body?: unknown; // Request body (Development only).
}
