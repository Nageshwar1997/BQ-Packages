import { mongoEventEmitter } from '../classes/index.js';
import type { IMongoEvents } from '../types/internal.js';

export const mongoEvents: IMongoEvents = {
  on: mongoEventEmitter.on.bind(mongoEventEmitter),
  once: mongoEventEmitter.once.bind(mongoEventEmitter),
  off: mongoEventEmitter.off.bind(mongoEventEmitter),
  listenerCount: mongoEventEmitter.listenerCount.bind(mongoEventEmitter),
} as const;
