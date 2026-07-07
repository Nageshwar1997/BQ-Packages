import express from 'express';

import { createLogger } from './core/create-logger.js';
import { createHttpLogger } from './http/create-http-logger.js';

const app = express();

app.use(express.json());

const logger = createLogger({
  service: 'gateway',
  pretty: true,
});

app.use(
  createHttpLogger({
    logger,
  }),
);

app.get('/', (_req, res) => {
  logger.info('Hello World');

  res.json({
    success: true,
  });
});

app.get('/error', () => {
  throw new Error('Something went wrong');
});

app.listen(3000, () => {
  logger.info('Server started');
});
