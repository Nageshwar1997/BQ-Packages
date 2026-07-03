import { EventEmitter } from 'node:events';

export interface MongoEvents {
  connected: [];
  disconnected: [];
  error: [Error];
  connecting: [];
  disconnecting: [];
}

class MongoEventEmitter extends EventEmitter {
  override on<K extends keyof MongoEvents>(
    event: K,
    listener: (...args: MongoEvents[K]) => void,
  ): this {
    return super.on(event, listener);
  }

  override once<K extends keyof MongoEvents>(
    event: K,
    listener: (...args: MongoEvents[K]) => void,
  ): this {
    return super.once(event, listener);
  }

  override emit<K extends keyof MongoEvents>(event: K, ...args: MongoEvents[K]): boolean {
    return super.emit(event, ...args);
  }
}

export const mongoEvents = new MongoEventEmitter();
