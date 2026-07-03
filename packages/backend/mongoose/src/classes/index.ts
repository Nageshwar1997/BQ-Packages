import { EventEmitter } from 'node:events';

import type { IMongoEventMap, IMongoEvents, TMongoEvent } from '../types/internal.js';

class MongoEventEmitter implements IMongoEvents {
  private readonly emitter = new EventEmitter();

  public on<K extends TMongoEvent>(event: K, listener: (...args: IMongoEventMap[K]) => void): this {
    this.emitter.on(event, listener);

    return this;
  }

  public once<K extends TMongoEvent>(
    event: K,
    listener: (...args: IMongoEventMap[K]) => void,
  ): this {
    this.emitter.once(event, listener);

    return this;
  }

  public off<K extends TMongoEvent>(
    event: K,
    listener: (...args: IMongoEventMap[K]) => void,
  ): this {
    this.emitter.off(event, listener);

    return this;
  }

  public listenerCount(event: TMongoEvent): number {
    return this.emitter.listenerCount(event);
  }

  private emit<K extends TMongoEvent>(event: K, ...args: IMongoEventMap[K]): boolean {
    return this.emitter.emit(event, ...args);
  }
  public emitMongoEvent<K extends TMongoEvent>(event: K, ...args: IMongoEventMap[K]): boolean {
    return this.emit(event, ...args);
  }
}

export const mongoEventEmitter = new MongoEventEmitter();
