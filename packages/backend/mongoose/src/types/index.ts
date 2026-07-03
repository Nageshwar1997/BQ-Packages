import type { ConnectOptions } from 'mongoose';

export interface MongoConnectOptions {
  uri: string;

  /**
   * Enables global connection caching.
   *
   * Useful in development environments with hot reload.
   *
   * @default false
   */
  enableGlobalCache?: boolean;

  options?: ConnectOptions;
}

export interface MongoConnectionHealth {
  readyState: number;
  connected: boolean;
  host: string | null;
  port: number | null;
  database: string | null;
}
