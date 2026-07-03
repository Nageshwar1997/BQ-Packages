import { connection } from 'mongoose';

import { CONNECTION_STATES } from '../constants/index.js';

export const connectionState = {
  get: () => connection.readyState,
  isConnected: () => connection.readyState === CONNECTION_STATES.connected,
  isDisconnected: () => connection.readyState === CONNECTION_STATES.disconnected,
  isConnecting: () => connection.readyState === CONNECTION_STATES.connecting,
  isDisconnecting: () => connection.readyState === CONNECTION_STATES.disconnecting,
  isUninitialized: () => connection.readyState === CONNECTION_STATES.uninitialized,
} as const;
