import type { JobsOptions } from 'bullmq';

import type { QUEUE_SCHEMA } from '../constants/index.js';

type TSchema = typeof QUEUE_SCHEMA;

export type TQueueName = keyof TSchema;

export type TJobName<Q extends TQueueName> = keyof TSchema[Q];

export type TJobData<Q extends TQueueName, J extends TJobName<Q>> = TSchema[Q][J];

export type TQueueJobUnion = {
  [Q in TQueueName]: {
    [J in TJobName<Q>]: { queueName: Q; jobName: J; data: TJobData<Q, J>; options?: JobsOptions };
  }[TJobName<Q>];
}[TQueueName];

export interface TEmailOtp {
  email: string;
  otp: string;
}

export interface TSingleMedia {
  publicId: string;
}
export interface TMultipleMedia {
  publicIds: string[];
  retryCount?: number;
}

export type TCreateMedia = TSingleMedia & Record<string, unknown>;
