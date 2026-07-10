import { ConfigurationError, DatabaseError } from '@beautinique/backend-classes';
import mongoose, { connect } from 'mongoose';

import { mongoEventEmitter } from '../classes/index.js';
import {
  CACHED_CONNECT_OPTIONS,
  CONNECTION_STATES,
  DEFAULT_CONNECT_OPTIONS,
  DEFAULT_RUNTIME_OPTIONS,
} from '../constants/index.js';
import { connectionState } from '../states/index.js';
import type { MongoConnectOptions } from '../types/index.js';

let listenersRegistered = false;
let mongooseConfigured = false;

export const connectDb = async ({
  uri,
  enableGlobalCache = false,
  options = {},
}: MongoConnectOptions): Promise<typeof mongoose> => {
  if (!uri.trim()) {
    throw new ConfigurationError('MongoDB connection URI is required.');
  }

  if (connectionState.isConnected()) {
    return mongoose;
  }

  if (enableGlobalCache) {
    if (global.mongooseConnection?.connection.readyState === CONNECTION_STATES.connected) {
      return global.mongooseConnection;
    }

    if (global.mongooseConnectionPromise) {
      return global.mongooseConnectionPromise;
    }
  }

  if (!mongooseConfigured) {
    mongoose.set('strictQuery', true);
    mongooseConfigured = true;
  }

  mongoEventEmitter.emitMongoEvent('connecting');

  const connectionPromise = connect(uri, {
    ...DEFAULT_CONNECT_OPTIONS,
    ...(enableGlobalCache ? CACHED_CONNECT_OPTIONS : DEFAULT_RUNTIME_OPTIONS),
    ...options,
  })
    .then((connection) => {
      if (!listenersRegistered) {
        listenersRegistered = true;

        connection.connection.on('disconnecting', () => {
          mongoEventEmitter.emitMongoEvent('disconnecting');
        });

        connection.connection.on('disconnected', () => {
          if (enableGlobalCache) {
            global.mongooseConnection = undefined;
            global.mongooseConnectionPromise = undefined;
          }

          mongoEventEmitter.emitMongoEvent('disconnected');
        });

        connection.connection.on('error', (error: Error) => {
          if (enableGlobalCache) {
            global.mongooseConnection = undefined;
            global.mongooseConnectionPromise = undefined;
          }

          mongoEventEmitter.emitMongoEvent('error', error);
        });
      }

      if (enableGlobalCache) {
        global.mongooseConnection = connection;
      }

      mongoEventEmitter.emitMongoEvent('connected');

      return connection;
    })
    .catch((error: unknown) => {
      if (enableGlobalCache) {
        global.mongooseConnection = undefined;
        global.mongooseConnectionPromise = undefined;
      }

      const err =
        error instanceof Error
          ? error
          : new DatabaseError(`Unknown MongoDB connection error: ${String(error)}`, {
              cause: error,
            });

      mongoEventEmitter.emitMongoEvent('error', err);

      throw err;
    });

  if (enableGlobalCache) {
    global.mongooseConnectionPromise = connectionPromise;
  }

  return connectionPromise;
};
