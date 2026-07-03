import mongoose from 'mongoose';

import { mongoEventEmitter } from '../classes/index.js';
import { connectionState } from '../states/index.js';

export const disconnectDB = async (): Promise<void> => {
  if (connectionState.isDisconnected() || connectionState.isUninitialized()) {
    return;
  }

  try {
    await mongoose.disconnect();

    global.mongooseConnection = undefined;
    global.mongooseConnectionPromise = undefined;
  } catch (error) {
    const err =
      error instanceof Error
        ? error
        : new Error(`Unknown MongoDB disconnect error: ${String(error)}`);

    mongoEventEmitter.emitMongoEvent('error', err);

    throw err;
  }
};
