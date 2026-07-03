import { EventEmitter } from 'node:events';

interface IMongoEventMap {
  connecting: [];
  connected: [];
  disconnecting: [];
  disconnected: [];
  error: [Error];
}

type TMongoEvent = keyof IMongoEventMap;

interface IMongoEvents {
  on<K extends TMongoEvent>(event: K, listener: (...args: IMongoEventMap[K]) => void): IMongoEvents;

  once<K extends TMongoEvent>(
    event: K,
    listener: (...args: IMongoEventMap[K]) => void,
  ): IMongoEvents;

  off<K extends TMongoEvent>(
    event: K,
    listener: (...args: IMongoEventMap[K]) => void,
  ): IMongoEvents;

  listenerCount(event: TMongoEvent): number;
}

const emitter = new EventEmitter();

export const mongoEvents: IMongoEvents = {
  on(event, listener) {
    emitter.on(event, listener);

    return this;
  },

  once(event, listener) {
    emitter.once(event, listener);

    return this;
  },

  off(event, listener) {
    emitter.off(event, listener);

    return this;
  },

  listenerCount(event) {
    return emitter.listenerCount(event);
  },
};
/**
 * Internal API.
 *
 * Do NOT export from index.ts.
 */
export const emitMongoEvent = <K extends TMongoEvent>(
  event: K,
  ...args: IMongoEventMap[K]
): void => {
  emitter.emit(event, ...args);
};
