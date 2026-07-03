import type { ConnectOptions } from 'mongoose';

export interface MongoConnectOptions {
  /**
   * MongoDB connection string.
   */
  uri: string;

  /**
   * Enables development optimizations such as global connection caching.
   *
   * @default false
   */
  isDev?: boolean;

  /**
   * Additional Mongoose connection options.
   */
  options?: ConnectOptions;
}

export interface MongoConnectionHealth {
  readyState: number;
  connected: boolean;
  host: string | null;
  port: number | null;
  database: string | null;
}
