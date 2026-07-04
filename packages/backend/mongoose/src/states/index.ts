import mongoose from 'mongoose';

import { CONNECTION_STATES } from '../constants/index.js';

export const connectionState = {
  get: () => mongoose.connection.readyState,
  isConnected: () => mongoose.connection.readyState === CONNECTION_STATES.connected,
  isDisconnected: () => mongoose.connection.readyState === CONNECTION_STATES.disconnected,
  isConnecting: () => mongoose.connection.readyState === CONNECTION_STATES.connecting,
  isDisconnecting: () => mongoose.connection.readyState === CONNECTION_STATES.disconnecting,
  isUninitialized: () => mongoose.connection.readyState === CONNECTION_STATES.uninitialized,
} as const;
