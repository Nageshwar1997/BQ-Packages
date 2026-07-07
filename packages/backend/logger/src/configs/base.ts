import type { Bindings } from 'pino';

import type { ILoggerOptions } from '../types/index.js';

/**
 * Builds the Pino `base` bindings - static fields merged into every log
 * line produced by a logger created via `createLogger`.
 *
 * Note this fully REPLACES Pino's own default base (`{ pid, hostname }`)
 * rather than extending it: in containerized deployments that information
 * is already available as Loki/Grafana labels (pod name, node, etc.), so
 * repeating it in every log body would only add noise and ingestion cost.
 *
 * @param options - The `createLogger` options `service` and `context` are read from.
 * @returns Bindings containing the service name plus any extra static context fields.
 */
export function createBase({ context, service }: ILoggerOptions): Bindings {
  return { service, ...context };
}
