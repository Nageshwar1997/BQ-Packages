# @beautinique/backend-bullmq

Schema-typed, production-ready [BullMQ](https://bullmq.io) queues/jobs/workers for Beautinique backend services.

- **One schema, every service** - `QUEUE_SCHEMA` is the single source of truth for every queue name, job name, and job payload shape. Add a queue/job there once; every service importing this package gets it type-checked.
- **Two classes** - `JobProducer` to add jobs from any service, `JobWorker` to process jobs for a queue in any (possibly different) service. Both are meant to be instantiated once per process and reused.
- **Compile-time complete workers** - a `JobWorker`'s `handlers` map must cover every job name `QUEUE_SCHEMA` declares for that queue, or it won't compile. No silently-unhandled job names.
- **Sane production defaults** - retries with exponential backoff, bounded `removeOnComplete`/`removeOnFail` so Redis memory doesn't grow unbounded, and structured logging hooks on every BullMQ event.

## Installation

```bash
npm install @beautinique/backend-bullmq
```

## Defining queues and jobs - `QUEUE_SCHEMA`

Every queue and job this package (and everything built on it) knows about lives in one place, `src/constants/index.ts`:

```ts
export const QUEUE_SCHEMA = {
  'mail-queue': {
    'send-otp': {} as IEmailOtp,
  },
  'media-queue': {
    'delete-single-media': {} as ISingleMedia,
    // ...
  },
} as const;
```

The value on the right of each job name is only ever used for its *type* (`as IEmailOtp`) - it drives `TJobData<Q, J>`, which both `JobProducer.addJob` and `JobWorker`'s `handlers` are checked against. Adding a queue or job here is the only change needed for it to show up, fully typed, everywhere this package is used.

## Adding jobs - `JobProducer`

```ts
import { JobProducer } from '@beautinique/backend-bullmq';
import { createLogger } from '@beautinique/backend-logger';

const logger = createLogger({ service: 'orders-api' });

export const jobProducer = new JobProducer({
  connection: { url: process.env.REDIS_URL },
  logger, // optional - any object with debug/info/warn/error(obj, msg?)
});

await jobProducer.addJob('mail-queue', 'send-otp', { email, otp });

await jobProducer.addBulkJobs('media-queue', [
  { name: 'delete-single-media', data: { publicId: 'a' } },
  { name: 'delete-single-media', data: { publicId: 'b' } },
]);
```

`queueName`, `jobName`, and `data` are all checked against `QUEUE_SCHEMA` - passing a job name that doesn't exist on that queue, or data of the wrong shape, is a compile error.

One `JobProducer` lazily opens (and caches) one BullMQ `Queue` per distinct queue name it's asked to add jobs to - create it once per process, not per request.

| Option              | Default               | Description                                                                   |
| ------------------- | --------------------- | ----------------------------------------------------------------------------- |
| `connection`        | _(required)_          | Redis connection - `RedisOptions`, an `ioredis`/`Cluster` instance, or a URL. |
| `defaultJobOptions` | `DEFAULT_JOB_OPTIONS` | Merged with (and overridable by) per-call `options`. See below.               |
| `queueOptions`      | `undefined`           | Extra options forwarded to every underlying `Queue`.                          |
| `logger`            | `undefined`           | Structured logs for enqueue calls and queue-level connection errors.          |

## Running workers - `JobWorker`

```ts
import { JobWorker } from '@beautinique/backend-bullmq';

new JobWorker({
  queueName: 'mail-queue',
  connection: { url: process.env.REDIS_URL },
  logger,
  handlers: {
    'send-otp': async ({ email, otp }) => {
      await sendOtpEmail(email, otp);
    },
  },
});
```

`handlers` must have one entry per job name `QUEUE_SCHEMA['mail-queue']` declares - if a new job name is added to the schema and this service forgets to handle it, `tsc` fails the build instead of the job silently stalling in Redis.

Each `JobWorker` instance runs exactly one queue - create one per queue a given process handles. `completed`/`failed`/`error`/`stalled` events are logged automatically when a `logger` is provided.

| Option          | Default                      | Description                                                     |
| --------------- | ---------------------------- | --------------------------------------------------------------- |
| `queueName`     | _(required)_                 | Which queue (from `QUEUE_SCHEMA`) this worker processes.        |
| `handlers`      | _(required)_                 | One handler per job name declared for that queue.               |
| `connection`    | _(required)_                 | Redis connection, same shape as `JobProducer`.                  |
| `concurrency`   | `DEFAULT_WORKER_CONCURRENCY` | Jobs processed in parallel by this worker.                      |
| `workerOptions` | `undefined`                  | Extra options forwarded to the underlying BullMQ `Worker`.      |
| `logger`        | `undefined`                  | Structured logs for job completion/failure/stall/worker errors. |

## Graceful shutdown

`JobProducer`/`JobWorker` never register process-level signal handlers themselves - a library silently hooking `SIGTERM` as a side effect of construction would fight a service's own shutdown sequencing. Wire it up explicitly instead:

```ts
import { registerGracefulShutdown } from '@beautinique/backend-bullmq';

registerGracefulShutdown([jobProducer, jobWorker], { logger });
```

On `SIGTERM`/`SIGINT`, this closes every given producer/worker (letting in-flight jobs finish) and then exits the process.

## Defaults

```ts
export const DEFAULT_WORKER_CONCURRENCY = 5;

export const DEFAULT_JOB_OPTIONS = {
  attempts: 3,
  backoff: { type: 'exponential', delay: 1000 },
  removeOnComplete: { count: 1000, age: 24 * 60 * 60 }, // 1000 jobs or 24h, whichever first
  removeOnFail: { count: 5000, age: 7 * 24 * 60 * 60 }, // 5000 jobs or 7d, whichever first
};
```

Override either per `JobProducer` (`defaultJobOptions`) or per call (`addJob`/`addBulkJobs`'s `options` argument).

## Repository

https://github.com/Nageshwar1997/BQ-Packages

## Homepage

https://github.com/Nageshwar1997/BQ-Packages

## Issues

https://github.com/Nageshwar1997/BQ-Packages/issues

## Author

Nageshwar Pawar

## License

This package is licensed under the MIT License. See the root `LICENSE` file for details.
