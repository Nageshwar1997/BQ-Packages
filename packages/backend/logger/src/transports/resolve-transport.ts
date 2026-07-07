import type { TransportSingleOptions } from 'pino';

import { createPrettyTransport } from './pretty.js';

/**
 * Resolves the Pino `transport` option for a given "pretty" mode.
 *
 * Production logs deliberately use no transport at all (`undefined`):
 * Pino writes raw JSON directly to `stdout` with no extra transformation,
 * which is the fastest path and the format Loki/Grafana expect to scrape.
 *
 * @param pretty - Whether development (pretty) output was requested.
 * @returns A transport target for development, or `undefined` for production JSON logs.
 */
export function resolveTransport(pretty: boolean): TransportSingleOptions | undefined {
  return pretty ? createPrettyTransport() : undefined;
}
