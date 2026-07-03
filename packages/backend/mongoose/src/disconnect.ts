import mongoose, { STATES } from 'mongoose';

export const disconnectDB = async (): Promise<void> => {
  if (mongoose.connection.readyState === STATES.disconnected) {
    return;
  }

  await mongoose.disconnect();
};
