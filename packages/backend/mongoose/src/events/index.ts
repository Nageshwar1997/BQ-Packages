import { EventEmitter } from 'node:events';

interface MongoEventMap {
  connecting: [];
  connected: [];
  disconnecting: [];
  disconnected: [];
  error: [Error];
}

const emitter = new EventEmitter();

export const mongoEvents = {
  on<K extends keyof MongoEventMap>(event: K, listener: (...args: MongoEventMap[K]) => void) {
    emitter.on(event, listener);

    return this;
  },

  once<K extends keyof MongoEventMap>(event: K, listener: (...args: MongoEventMap[K]) => void) {
    emitter.once(event, listener);

    return this;
  },

  off<K extends keyof MongoEventMap>(event: K, listener: (...args: MongoEventMap[K]) => void) {
    emitter.off(event, listener);

    return this;
  },
};

export const emitMongoEvent = <K extends keyof MongoEventMap>(
  event: K,
  ...args: MongoEventMap[K]
): void => {
  emitter.emit(event, ...args);
};
