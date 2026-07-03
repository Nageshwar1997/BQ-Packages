import mongoose from 'mongoose';

import { mongoEventEmitter } from '../classes/index.js';

export const disconnectDB = async (): Promise<void> => {
  if (
    mongoose.connection.readyState === mongoose.STATES.disconnected ||
    mongoose.connection.readyState === mongoose.STATES.uninitialized
  ) {
    return;
  }

  mongoEventEmitter.emitMongoEvent('disconnecting');

  try {
    await mongoose.disconnect();

    global.mongooseConnection = undefined;
    global.mongooseConnectionPromise = undefined;
  } catch (error) {
    mongoEventEmitter.emitMongoEvent('error', error as Error);

    throw error;
  }
};
