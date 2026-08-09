import { createRequire } from 'node:module';

import type { DestinationStream } from 'pino';
import type PinoPretty from 'pino-pretty';

/**
 * Builds an in-process, `pino-pretty`-formatted destination for readable
 * development output.
 *
 * Uses `pino-pretty`'s `prettyFactory` - a plain `(line: string) => string`
 * formatter - rather than its default `build` export: that default export
 * wraps `pino-abstract-transport` and manages its own internal destination
 * stream, which is designed for pino's worker-thread transport mechanism,
 * not for being driven manually via repeated `.write()` calls. Using it
 * directly here would double-write every log line (once via its internal
 * destination, once via whatever consumes this function's return value).
 *
 * `pino-pretty` is only ever `require`-d here, lazily and synchronously
 * (via `createRequire`), the moment this function actually runs - never
 * at module load time. This keeps it a true optional dependency: a
 * production install that never sets `pretty: true` never needs
 * `pino-pretty` to be resolvable on disk at all.
 *
 * @returns A Pino-compatible destination stream that writes formatted, colorized lines to `stdout`.
 */
export function createPrettyStream(): DestinationStream {
  const require = createRequire(import.meta.url);
  const pinoPretty = require('pino-pretty') as typeof PinoPretty;

  const format = pinoPretty.prettyFactory({
    colorize: true,
    translateTime: 'SYS:standard',
    ignore: 'pid,hostname',
  });

  return {
    write(msg: string) {
      process.stdout.write(format(msg));
    },
  };
}
