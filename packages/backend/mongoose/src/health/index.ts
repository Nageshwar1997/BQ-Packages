import { connection } from 'mongoose';

import { connectionState } from '../states/index.js';
import type { MongoConnectionHealth } from '../types/index.js';

export const getConnectionHealth = (): MongoConnectionHealth => ({
  readyState: connectionState.get(),
  connected: connectionState.isConnected(),
  host: connection.host || null,
  port: connection.port || null,
  database: connection.name || null,
});
