import { STATES } from 'mongoose';

export const DEFAULT_CONNECT_OPTIONS = {
  serverSelectionTimeoutMS: 5_000,
  socketTimeoutMS: 45_000,
  maxPoolSize: 10,
  minPoolSize: 2,
  retryWrites: true,
} as const;

export const DEV_CONNECT_OPTIONS = { maxPoolSize: 5, minPoolSize: 1, autoIndex: true } as const;

export const PROD_CONNECT_OPTIONS = { autoIndex: false } as const;

export const CONNECTION_STATES = STATES;
