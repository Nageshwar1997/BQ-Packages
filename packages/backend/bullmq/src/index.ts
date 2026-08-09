/**
 * @beautinique/backend-bullmq
 *
 * A schema-typed, production-ready BullMQ wrapper for the Beautinique
 * backend, providing:
 *  - `QUEUE_SCHEMA` - the single source of truth for every queue, job name,
 *    and job payload shape, shared across every service.
 *  - `JobProducer` - adds jobs to any queue in `QUEUE_SCHEMA`, fully
 *    type-checked against it.
 *  - `JobWorker` - runs jobs for a single queue, dispatching to a
 *    per-job-name handler map that the schema requires be complete.
 *  - `registerGracefulShutdown` - opt-in clean shutdown for both.
 *
 * See the package README for full usage and configuration details.
 */
export * from './constants/index.js';
export * from './errors/index.js';
export * from './producer/index.js';
export * from './types/index.js';
export * from './utils/index.js';
export * from './worker/index.js';
