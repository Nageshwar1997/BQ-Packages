import type { Job, JobsOptions } from 'bullmq';
import { Queue } from 'bullmq';

import { DEFAULT_JOB_OPTIONS } from '../constants/index.js';
import { JobQueueConfigurationError } from '../errors/index.js';
import type {
  IJobProducerOptions,
  TBulkJobItem,
  TJobData,
  TJobName,
  TLogger,
  TQueueName,
} from '../types/index.js';

type TAnyQueue = Queue<unknown, unknown>;

/**
 * Adds jobs to any queue declared in `QUEUE_SCHEMA`, fully type-safe against
 * the schema (queue name, job name, and job data all cross-checked at
 * compile time).
 *
 * One instance is meant to be created once per service and reused for the
 * service's lifetime - it lazily creates (and caches) one BullMQ `Queue`
 * per distinct queue name it's asked to add jobs to, so repeated calls
 * don't open new Redis connections.
 *
 * @example
 * ```ts
 * const producer = new JobProducer({ connection: { url: process.env.REDIS_URL }, logger });
 *
 * await producer.addJob('mail-queue', 'send-otp', { email, otp });
 * ```
 */
export class JobProducer {
  private readonly connection: IJobProducerOptions['connection'];
  private readonly defaultJobOptions: JobsOptions;
  private readonly queueOptions: IJobProducerOptions['queueOptions'];
  private readonly logger: TLogger | undefined;
  private readonly queues = new Map<TQueueName, TAnyQueue>();

  constructor(options: IJobProducerOptions) {
    // `connection` is typed as required, but this guard still matters for
    // plain JS/loosely-typed consumers calling across this public API boundary.
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (!options.connection) {
      throw new JobQueueConfigurationError('JobProducer requires a "connection" to Redis.');
    }

    this.connection = options.connection;
    this.defaultJobOptions = { ...DEFAULT_JOB_OPTIONS, ...options.defaultJobOptions };
    this.queueOptions = options.queueOptions;
    this.logger = options.logger;
  }

  /** Returns the cached `Queue` for `queueName`, creating it on first use. */
  private resolveQueue(queueName: TQueueName): TAnyQueue {
    const existing = this.queues.get(queueName);
    if (existing) {
      return existing;
    }

    const queue = new Queue<unknown, unknown>(queueName, {
      ...this.queueOptions,
      connection: this.connection,
      defaultJobOptions: this.defaultJobOptions,
    });

    queue.on('error', (error) => {
      this.logger?.error({ queue: queueName, err: error }, 'Queue connection error.');
    });

    this.queues.set(queueName, queue);
    return queue;
  }

  /** Adds a single, schema-validated job to `queueName`. */
  public async addJob<Q extends TQueueName, J extends TJobName<Q>>(
    queueName: Q,
    jobName: J,
    data: TJobData<Q, J>,
    options?: JobsOptions,
  ): Promise<Job<TJobData<Q, J>, unknown, J & string>> {
    const queue = this.resolveQueue(queueName);
    const job = await queue.add(jobName as string, data, options);

    this.logger?.debug({ queue: queueName, job: jobName, jobId: job.id }, 'Job enqueued.');

    return job as Job<TJobData<Q, J>, unknown, J & string>;
  }

  /** Adds many jobs to `queueName` in a single round-trip to Redis. */
  public async addBulkJobs<Q extends TQueueName>(
    queueName: Q,
    jobs: readonly TBulkJobItem<Q>[],
  ): Promise<Job<unknown, unknown>[]> {
    if (jobs.length === 0) {
      return [];
    }

    const queue = this.resolveQueue(queueName);
    const created = await queue.addBulk(
      jobs.map((job) => ({ name: job.name as string, data: job.data, opts: job.options })),
    );

    this.logger?.debug({ queue: queueName, count: created.length }, 'Bulk jobs enqueued.');

    return created;
  }

  /** Escape hatch for advanced use (e.g. `getJobCounts`, `pause`) not covered by this class. */
  public getQueueInstance(queueName: TQueueName): TAnyQueue {
    return this.resolveQueue(queueName);
  }

  /** Closes every underlying `Queue` connection this producer has opened. */
  public async close(): Promise<void> {
    await Promise.all([...this.queues.values()].map((queue) => queue.close()));
    this.queues.clear();
  }
}
