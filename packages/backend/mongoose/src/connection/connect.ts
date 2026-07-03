import mongoose, { connect } from 'mongoose';

import {
  DEFAULT_CONNECT_OPTIONS,
  DEV_CONNECT_OPTIONS,
  PROD_CONNECT_OPTIONS,
} from '../constants/index.js';
import { emitMongoEvent } from '../events/index.js';
import type { MongoConnectOptions } from '../types/index.js';

let listenersRegistered = false;

export const connectToDB = async ({
  uri,
  isDev = false,
  options = {},
}: MongoConnectOptions): Promise<typeof mongoose> => {
  if (!uri.trim()) {
    throw new Error('MongoDB connection URI is required.');
  }

  /**
   * Already connected.
   */
  if (mongoose.connection.readyState === mongoose.STATES.connected) {
    return mongoose;
  }

  /**
   * Development cache.
   */
  if (isDev) {
    if (global.mongooseConnection) {
      return global.mongooseConnection;
    }

    if (global.mongooseConnectionPromise) {
      return global.mongooseConnectionPromise;
    }
  }

  mongoose.set('strictQuery', true);

  emitMongoEvent('connecting');

  const connectionPromise = connect(uri, {
    ...DEFAULT_CONNECT_OPTIONS,
    ...(isDev ? DEV_CONNECT_OPTIONS : PROD_CONNECT_OPTIONS),
    ...options,
  })
    .then((connection) => {
      if (!listenersRegistered) {
        listenersRegistered = true;

        mongoose.connection.on('connected', () => {
          emitMongoEvent('connected');
        });

        mongoose.connection.on('disconnected', () => {
          if (isDev) {
            global.mongooseConnection = undefined;
            global.mongooseConnectionPromise = undefined;
          }

          emitMongoEvent('disconnected');
        });

        mongoose.connection.on('disconnecting', () => {
          emitMongoEvent('disconnecting');
        });

        mongoose.connection.on('error', (error) => {
          if (isDev) {
            global.mongooseConnection = undefined;
            global.mongooseConnectionPromise = undefined;
          }

          emitMongoEvent('error', error as Error);
        });
      }

      if (isDev) {
        global.mongooseConnection = connection;
      }

      emitMongoEvent('connected');

      return connection;
    })
    .catch((error: unknown) => {
      if (isDev) {
        global.mongooseConnection = undefined;
        global.mongooseConnectionPromise = undefined;
      }

      emitMongoEvent('error', error as Error);

      throw error;
    });

  if (isDev) {
    global.mongooseConnectionPromise = connectionPromise;
  }

  return connectionPromise;
};
