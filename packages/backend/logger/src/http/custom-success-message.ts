import type { TCustomSuccessMessage } from '../types/index.js';

/**
 * The success log message used for every HTTP request handled through
 * `createHttpLogger`.
 *
 * Kept as a single, fixed format (rather than consumer-configurable) so
 * that log messages are consistent and therefore easy to query/alert on
 * across every service shipping to the same Loki/Grafana instance.
 */
export const customSuccessMessage: TCustomSuccessMessage = (_request, response) => {
  return `Request completed with status ${String(response.statusCode)}`;
};
