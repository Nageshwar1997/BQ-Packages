import { createLogger } from './create-logger.js';

/**
 * A ready-to-use default logger instance (`service: "app"`), for quick
 * scripts, one-off CLI tools, or anywhere a fully-named service logger
 * isn't warranted.
 *
 * Real services should generally prefer calling `createLogger({ service:
 * '<name>' })` directly so logs can be filtered/grouped by service in
 * Grafana/Loki.
 */
export const logger = createLogger({
  service: 'app',
});
