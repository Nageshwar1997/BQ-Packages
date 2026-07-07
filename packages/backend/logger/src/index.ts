import express from 'express';

import { createLogger } from './core/index.js';
import { createHttpLogger } from './http/index.js';
const logger = createLogger({
  service: 'gateway',
  pretty: true,
});

const httpLogger = createHttpLogger({
  logger,
});


const app = express();

app.use(httpLogger);

app.get('/', (_, res) => {
  res.send('Hello');
});

app.listen(3000);
