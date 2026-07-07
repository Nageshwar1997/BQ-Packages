import type { TransportSingleOptions } from 'pino';

/**
 * Builds the `pino-pretty` transport target used for development output.
 *
 * `pino-pretty` is loaded lazily by Pino via its own worker thread (Pino
 * resolves the string `target: 'pino-pretty'` at runtime), so this package
 * never imports it directly - keeping `pino-pretty` an optional dependency
 * that only needs to be installed where `pretty: true` is actually used.
 *
 * @returns Transport options for a single, readable, colorized stream.
 */
export function createPrettyTransport(): TransportSingleOptions {
  return {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:standard',
      ignore: 'pid,hostname',
    },
  };
}
