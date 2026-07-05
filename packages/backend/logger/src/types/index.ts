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

export interface IRequest extends Pick<SerializedRequest, 'method' | 'url' | 'id'> {
  query?: Record<string, unknown>;
  params?: Record<string, unknown>;
  headers: Record<string, string | string[] | undefined>;
  originalUrl?: string;
  ip?: string;
  body?: unknown;
  socket?: Partial<Pick<SerializedRequest, 'remoteAddress' | 'remotePort'>>;
}

export interface ISerializedRequest
  extends
    Pick<SerializedRequest, 'id' | 'method' | 'url' | 'remoteAddress' | 'remotePort'>,
    Pick<IRequest, 'query' | 'params' | 'ip'> {
  userAgent?: string; //User-Agent header.
  body?: unknown; // Request body (Development only).
}
