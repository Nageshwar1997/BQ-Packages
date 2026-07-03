import mongoose from 'mongoose';

import { emitMongoEvent } from '../events/index.js';

export const disconnectDB = async (): Promise<void> => {
  if (
    mongoose.connection.readyState === mongoose.STATES.disconnected ||
    mongoose.connection.readyState === mongoose.STATES.uninitialized
  ) {
    return;
  }

  emitMongoEvent('disconnecting');

  try {
    await mongoose.disconnect();

    global.mongooseConnection = undefined;
    global.mongooseConnectionPromise = undefined;
  } catch (error) {
    emitMongoEvent('error', error as Error);

    throw error;
  }
};
