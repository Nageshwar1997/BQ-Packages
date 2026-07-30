import type { ConnectionOptions, Job, JobsOptions, QueueOptions, WorkerOptions } from 'bullmq';

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

/** One entry of a bulk `addBulkJobs` call, discriminated by job name within a single queue. */
export type TBulkJobItem<Q extends TQueueName> = {
  [J in TJobName<Q>]: { name: J; data: TJobData<Q, J>; options?: JobsOptions };
}[TJobName<Q>];

/**
 * Minimal, duck-typed logging surface this package needs.
 *
 * Deliberately not importing `Logger` from `@beautinique/backend-logger` (or
 * any other logger) so this package stays usable with `pino`, `console`,
 * `winston`, or no logger at all - the same reasoning `backend-logger`
 * itself uses to avoid depending on `@beautinique/backend-classes`.
 */
export interface TLogger {
  debug: (obj: Record<string, unknown>, msg?: string) => void;
  info: (obj: Record<string, unknown>, msg?: string) => void;
  warn: (obj: Record<string, unknown>, msg?: string) => void;
  error: (obj: Record<string, unknown>, msg?: string) => void;
}

/** Handler for a single job within a queue, dispatched to by `JobWorker`. */
export type TJobHandler<Q extends TQueueName, J extends TJobName<Q>> = (
  data: TJobData<Q, J>,
  job: Job<TJobData<Q, J>, unknown, J & string>,
) => Promise<unknown>;

/** One handler per job name declared for the queue in `QUEUE_SCHEMA` - enforced at compile time. */
export type TJobHandlers<Q extends TQueueName> = {
  [J in TJobName<Q>]: TJobHandler<Q, J>;
};

export interface IJobProducerOptions {
  /** Redis connection - a `RedisOptions` object, an `ioredis`/`Cluster` instance, or a connection string. */
  connection: ConnectionOptions;
  /** Merged with (and overridable by) per-call `options` on `addJob`/`addBulkJobs`. @default DEFAULT_JOB_OPTIONS */
  defaultJobOptions?: JobsOptions;
  /** Extra options forwarded to every underlying `Queue` instance. */
  queueOptions?: Omit<QueueOptions, 'connection' | 'defaultJobOptions'>;
  logger?: TLogger;
}

export interface IJobWorkerOptions<Q extends TQueueName> {
  queueName: Q;
  /** One handler per job name in this queue's schema - see `TJobHandlers`. */
  handlers: TJobHandlers<Q>;
  connection: ConnectionOptions;
  /** @default DEFAULT_WORKER_CONCURRENCY */
  concurrency?: number;
  /** Extra options forwarded to the underlying `Worker` instance. */
  workerOptions?: Omit<WorkerOptions, 'connection' | 'concurrency'>;
  logger?: TLogger;
}

export interface TEmailOtp {
  email: string;
  otp: string;
}

export interface TContact {
  to: string;
  subject: string;
  data: Record<string, unknown>;
}

export interface TSingleMedia {
  publicId: string;
}
export interface TMultipleMedia {
  publicIds: string[];
  retryCount?: number;
}

export type TCreateMedia = TSingleMedia & Record<string, unknown>;
