import pino, { type DestinationStream } from 'pino';

import { createFileLogRouter } from './create-file-log-router.js';
import { createPrettyStream } from './create-pretty-stream.js';

export interface IResolveDestinationOptions {
  /** Whether to use human-readable, colorized output instead of raw JSON. */
  pretty: boolean;
  /** Directory to additionally split logs into (see `createFileLogRouter`), if provided. */
  logsDir?: string;
}

/**
 * Resolves the final Pino destination.
 *
 * The "console" stream is always present - `pino-pretty` piped to
 * `stdout` in development, or Pino's own optimized `stdout` destination in
 * production (raw JSON, the format Loki/Grafana expect to scrape).
 *
 * When `logsDir` is supplied, that console stream is combined - via
 * `pino.multistream` - with a file-based log router, so every log line is
 * written to both destinations.
 *
 * @param options - `pretty` selects the console format; `logsDir` optionally enables file logging.
 * @returns A destination suitable for `pino(options, destination)`.
 */
export function resolveDestination({
  pretty,
  logsDir,
}: IResolveDestinationOptions): DestinationStream {
  const consoleStream = pretty ? createPrettyStream() : pino.destination(1);

  if (!logsDir) {
    return consoleStream;
  }

  return pino.multistream([{ stream: consoleStream }, { stream: createFileLogRouter(logsDir) }]);
}
