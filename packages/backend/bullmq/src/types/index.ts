import type {
  TAdminStatus,
  TCreateContactQueryZodSchema,
  TMediaResource,
  TStateOrUT,
  TTerritoryAssignmentReason,
  TUserRole,
} from '@beautinique/backend-types';
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

export interface IContactAdminNotificationData extends TCreateContactQueryZodSchema {
  ticketId: string;
}
export type TContactAcknowledgementData = Pick<
  IContactAdminNotificationData,
  'queryType' | 'ticketId'
>;

export interface IMail {
  to: string;
  subject: string;
}

export interface IContactAcknowledgement extends IMail {
  data: TContactAcknowledgementData;
}

export interface IContactAdminNotification extends IMail {
  data: IContactAdminNotificationData;
}

export interface ISingleMedia {
  publicId: string;
}
export interface IMultipleMedia {
  publicIds: string[];
  retryCount?: number;
}

export interface ICreateMedia extends ISingleMedia {
  userId: string;
  url: string;
  resourceType: TMediaResource;
  createdAt: Date;
  metadata: {
    width: number;
    height: number;
    format: string;
    size: number;
    folder: string;
  };
}

/* ================== ADMIN TERRITORY (state-wise assignment) ================== */

/**
 * Published by `user-service` (a) whenever an `Admin`'s territory or
 * `status` changes, and (b) once per `Admin` in response to a
 * `resync-admin-territories` request. Always the FULL current snapshot for
 * one admin (not a delta) - `organization-service` just upserts its local
 * `AdminTerritory` mirror by `adminUserId`. No service-to-service HTTP call
 * anywhere in this flow - see the state -> admin resolution algorithm in the
 * assignment plan doc.
 *
 * `adminName`/`adminEmail` are denormalized here (not re-fetched live) so
 * organization-service can send the "seller assigned" notification without
 * a second round-trip - acceptable staleness window since profile changes
 * are rare and every territory/status change refreshes them anyway.
 */
export interface IAdminTerritorySynced {
  adminUserId: string;
  adminName: string;
  adminEmail: string;
  /** `ADMIN` or `SUPER_ADMIN` in practice - typed broadly since it's a straight `User.role` copy. */
  role: TUserRole;
  assignedStates: TStateOrUT[];
  status: TAdminStatus;
  priority: number;
  backupAdminUserId?: string;
}

/**
 * Published by `organization-service` after resolving+stamping
 * `Seller.assignedAdmin`. Consumed by `product-service` to cache
 * `assignment:user-admin:<USER_ID>` for routing that seller's product
 * reviews without duplicating the resolution logic.
 */
export interface ISellerAdminAssigned {
  userId: string;
  sellerId: string;
  assignedAdminId: string;
  state: TStateOrUT;
  reason: TTerritoryAssignmentReason;
}

export interface ISellerAssignedNotification extends IMail {
  data: {
    sellerBusinessName: string;
    state: TStateOrUT;
  };
}

export interface IAdminStatusChangeNotification extends IMail {
  data: {
    adminName: string;
    newStatus: TAdminStatus;
    states: TStateOrUT[];
  };
}
