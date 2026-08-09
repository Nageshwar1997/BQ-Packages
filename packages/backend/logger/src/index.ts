/**
 * @beautinique/backend-logger
 *
 * A framework-agnostic, production-ready logging package built on Pino,
 * providing:
 *  - `createLogger` - the core application logger (CLIs, workers, cron
 *    jobs, background queues, HTTP servers).
 *  - `createHttpLogger` - an independent, `pino-http`-backed HTTP
 *    request/response logger that shares a Pino instance with the core logger.
 *  - Secure-by-default redaction, and request/response/error serializers.
 *
 * See the package README for full usage and configuration details.
 */
export { createLogger } from './core/index.js';
export { createHttpLogger } from './http/index.js';
