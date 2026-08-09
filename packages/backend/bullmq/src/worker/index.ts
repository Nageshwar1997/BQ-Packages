import type { Job } from 'bullmq';
import { Worker } from 'bullmq';

import { DEFAULT_WORKER_CONCURRENCY } from '../constants/index.js';
import { JobQueueConfigurationError } from '../errors/index.js';
import type { IJobWorkerOptions, TJobHandlers, TLogger, TQueueName } from '../types/index.js';

type TAnyWorker = Worker<unknown, unknown>;
type TAnyJob = Job<unknown, unknown>;

/**
 * Runs jobs for a single queue declared in `QUEUE_SCHEMA`, dispatching each
 * job to the matching entry in `handlers` by job name.
 *
 * `TJobHandlers<Q>` requires one handler per job name the schema declares
 * for that queue, so a missing handler is a compile-time error, not a
 * runtime surprise - the `JobQueueConfigurationError` thrown from the
 * processor below only fires for a job name that isn't in the schema at
 * all (e.g. added by a mismatched producer version).
 *
 * One instance is meant to be created once per worker process per queue.
 *
 * @example
 * ```ts
 * new JobWorker({
 *   queueName: 'mail-queue',
 *   connection: { url: process.env.REDIS_URL },
 *   logger,
 *   handlers: {
 *     'send-otp': async ({ email, otp }) => sendOtpEmail(email, otp),
 *   },
 * });
 * ```
 */
export class JobWorker<Q extends TQueueName> {
  readonly queueName: Q;

  private readonly logger: TLogger | undefined;
  private readonly worker: TAnyWorker;

  constructor(options: IJobWorkerOptions<Q>) {
    // `connection`/`queueName` are typed as required, but these guards still
    // matter for plain JS/loosely-typed consumers calling across this public
    // API boundary.
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (!options.connection) {
      throw new JobQueueConfigurationError('JobWorker requires a "connection" to Redis.');
    }
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (!options.queueName) {
      throw new JobQueueConfigurationError('JobWorker requires a "queueName".');
    }

    this.queueName = options.queueName;
    this.logger = options.logger;

    const handlers = options.handlers;

    this.worker = new Worker<unknown, unknown>(
      options.queueName,
      (job) => this.dispatch(handlers, job),
      {
        ...options.workerOptions,
        connection: options.connection,
        concurrency: options.concurrency ?? DEFAULT_WORKER_CONCURRENCY,
      },
    );

    this.registerListeners();
  }

  /**
   * Looks up and invokes the handler for `job.name`.
   *
   * The cast here is a single, contained escape hatch: BullMQ's processor
   * callback only knows `job.name` as `string`, so calling a union of
   * per-job-name handler signatures isn't something TypeScript can verify
   * at this call site. Completeness of `handlers` itself is still fully
   * enforced at compile time by `TJobHandlers<Q>`.
   */
  private async dispatch(handlers: TJobHandlers<Q>, job: TAnyJob): Promise<unknown> {
    const handler = (handlers as Record<string, (data: unknown, job: unknown) => Promise<unknown>>)[
      job.name
    ];

    // `handlers` is required to cover every job name in the schema (enforced
    // by `TJobHandlers<Q>` at compile time), but the cast above widens that
    // to an arbitrary string index, so this guards against a job name BullMQ
    // hands back at runtime that isn't actually in the schema (e.g. added by
    // a mismatched producer version).
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (!handler) {
      throw new JobQueueConfigurationError(
        `No handler registered for job "${job.name}" on queue "${this.queueName}".`,
      );
    }

    return handler(job.data, job);
  }

  private registerListeners(): void {
    this.worker.on('completed', (job) => {
      this.logger?.info(
        { queue: this.queueName, jobId: job.id, jobName: job.name },
        'Job completed.',
      );
    });

    this.worker.on('failed', (job, error) => {
      this.logger?.error(
        {
          queue: this.queueName,
          jobId: job?.id,
          jobName: job?.name,
          attemptsMade: job?.attemptsMade,
          err: error,
        },
        'Job failed.',
      );
    });

    this.worker.on('error', (error) => {
      this.logger?.error({ queue: this.queueName, err: error }, 'Worker-level error.');
    });

    this.worker.on('stalled', (jobId) => {
      this.logger?.warn({ queue: this.queueName, jobId }, 'Job stalled.');
    });
  }

  /** Whether the underlying BullMQ worker is actively processing jobs. */
  public isRunning(): boolean {
    return this.worker.isRunning();
  }

  /** Stops picking up new jobs; in-flight jobs are allowed to finish. */
  public async pause(): Promise<void> {
    await this.worker.pause();
  }

  /** Resumes a paused worker. */
  public resume(): void {
    this.worker.resume();
  }

  /** Escape hatch for advanced use (e.g. extra event listeners) not covered by this class. */
  public getWorkerInstance(): TAnyWorker {
    return this.worker;
  }

  /**
   * Gracefully closes the worker.
   *
   * @param force - Skips waiting for in-flight jobs to finish. Prefer the
   * default (`false`) so a deploy/restart doesn't abandon a running job.
   */
  public async close(force = false): Promise<void> {
    await this.worker.close(force);
  }
}
