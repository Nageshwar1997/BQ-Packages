import { createRequire } from 'node:module';

import type { DestinationStream } from 'pino';
import type PinoPretty from 'pino-pretty';

/**
 * Builds an in-process `pino-pretty` stream, piped straight to `stdout`,
 * used for readable development output.
 *
 * `pino-pretty` is only ever `require`-d here, lazily and synchronously
 * (via `createRequire`), the moment this function actually runs - never
 * at module load time. This keeps it a true optional dependency: a
 * production install that never sets `pretty: true` never needs
 * `pino-pretty` to be resolvable on disk at all.
 *
 * `pino-pretty`'s stream is a `Transform` (raw log line in, formatted
 * text out) rather than a plain writable sink, so its output must be
 * explicitly piped to `stdout` - Pino itself only ever calls `.write()`
 * on the destination it's given, it does not know (or need to know) that
 * pretty-printing is happening underneath.
 *
 * @returns A Pino-compatible destination stream.
 */
export function createPrettyStream(): DestinationStream {
  const require = createRequire(import.meta.url);
  const pinoPretty = require('pino-pretty') as typeof PinoPretty;

  const stream = pinoPretty({
    colorize: true,
    translateTime: 'SYS:standard',
    ignore: 'pid,hostname',
  });

  stream.pipe(process.stdout);

  return stream;
}
