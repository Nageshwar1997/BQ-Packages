import type mongoose from 'mongoose';

declare global {
  var mongooseConnection: typeof mongoose | undefined;

  var mongooseConnectionPromise: Promise<typeof mongoose> | undefined;
}

export {};
