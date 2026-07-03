import mongoose, { connect, type ConnectOptions, STATES } from 'mongoose';

declare global {
  var mongooseConnection: typeof mongoose | undefined;
  var mongooseConnectionPromise: Promise<typeof mongoose> | undefined;
}

export interface MongoOptions {
  uri: string;
  isDev?: boolean;
  options?: ConnectOptions;
  events?: {
    onConnected?: (mong: typeof mongoose) => void;
    onDisconnected?: () => void;
    onError?: (error: Error) => void;
  };
}

let listenersRegistered = false;

const registerListeners = (isDev: boolean, events?: MongoOptions['events']): void => {
  if (listenersRegistered) {
    return;
  }

  listenersRegistered = true;

  mongoose.connection.on('disconnected', () => {
    if (isDev) {
      global.mongooseConnection = undefined;
      global.mongooseConnectionPromise = undefined;
    }

    events?.onDisconnected?.();
  });

  mongoose.connection.on('error', (error) => {
    if (isDev) {
      global.mongooseConnection = undefined;
      global.mongooseConnectionPromise = undefined;
    }

    events?.onError?.(error as Error);
  });
};

export const connectToDB = async ({
  uri,
  isDev = false,
  options = {},
  events,
}: MongoOptions): Promise<typeof mongoose> => {
  if (!uri.trim()) {
    throw new Error('MongoDB URI not provided.');
  }

  if (mongoose.connection.readyState === STATES.connected) {
    return mongoose;
  }

  if (isDev) {
    if (global.mongooseConnection) {
      return global.mongooseConnection;
    }

    if (global.mongooseConnectionPromise) {
      return global.mongooseConnectionPromise;
    }
  }

  mongoose.set('strictQuery', true);

  const promise = connect(uri, {
    serverSelectionTimeoutMS: 5_000,
    socketTimeoutMS: 45_000,
    maxPoolSize: isDev ? 5 : 10,
    minPoolSize: isDev ? 1 : 2,
    autoIndex: isDev,
    retryWrites: true,
    ...options,
  })
    .then((connection) => {
      registerListeners(isDev, events);

      if (isDev) {
        global.mongooseConnection = connection;
      }

      events?.onConnected?.(connection);

      return connection;
    })
    .catch((error: unknown) => {
      if (isDev) {
        global.mongooseConnection = undefined;
        global.mongooseConnectionPromise = undefined;
      }

      events?.onError?.(error as Error);

      throw error;
    });

  if (isDev) {
    global.mongooseConnectionPromise = promise;
  }

  return promise;
};
