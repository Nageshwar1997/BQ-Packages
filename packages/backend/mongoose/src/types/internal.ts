
export interface IMongoEventMap {
  connecting: [];
  connected: [];
  disconnecting: [];
  disconnected: [];
  error: [Error];
}

export interface IMongoEvents {
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

export type TMongoEvent = keyof IMongoEventMap;