import { randomUUID } from 'node:crypto';
import type { IncomingMessage } from 'node:http';

/**
 * Resolves the request ID used to correlate every log line for a single
 * HTTP request.
 *
 * If an upstream caller (a gateway, load balancer, or another service)
 * already assigned an `x-request-id` header, it is reused as-is - this is
 * what allows a single request ID to be traced across multiple
 * microservices in Grafana/Loki. Otherwise a new one is generated with
 * `crypto.randomUUID()`.
 *
 * If the header was sent multiple times, Node parses it as a `string[]`
 * rather than a `string`; that case is treated as "no valid id supplied"
 * and falls through to generating a fresh one, rather than risking an
 * ambiguous/attacker-influenced correlation id.
 *
 * @param request - The incoming HTTP request.
 * @returns The reused or newly generated request id.
 */
export function generateRequestId(request: IncomingMessage): string {
  const requestId = request.headers['x-request-id'];

  if (typeof requestId === 'string' && requestId.trim().length > 0) {
    return requestId;
  }

  return randomUUID();
}
