import { createLogger } from './core/create-logger.js';

const logger = createLogger({
  service: 'test-service',
  pretty: true,
});

logger.info('Logger initialized');

logger.error(new Error('Something went wrong'));
