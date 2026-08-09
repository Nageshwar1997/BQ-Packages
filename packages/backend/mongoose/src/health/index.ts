import mongoose from 'mongoose';

import { connectionState } from '../states/index.js';
import type { MongoConnectionHealth } from '../types/index.js';

export const getConnectionHealth = (): MongoConnectionHealth => ({
  readyState: connectionState.get(),
  connected: connectionState.isConnected(),
  host: mongoose.connection.host || null,
  port: mongoose.connection.port || null,
  database: mongoose.connection.name || null,
});
