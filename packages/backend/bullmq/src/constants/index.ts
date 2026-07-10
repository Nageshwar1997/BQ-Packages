import type { JobsOptions } from 'bullmq';

import type { TCreateMedia, TEmailOtp, TMultipleMedia, TSingleMedia } from '../types/index.js';

export const QUEUE_SCHEMA = {
  /* ---------------- MAIL QUEUES ---------------- */
  'mail-queue': { 'send-otp': {} as TEmailOtp },

  /* ---------------- MEDIA QUEUES ---------------- */
  'media-queue': {
    /* ---------------- CLOUDINARY JOBS ---------------- */

    'remove-single-media-directly': {} as TSingleMedia,
    'remove-multiple-media-directly': {} as TMultipleMedia,

    /* ---------------- MEDIA CREATE JOBS ---------------- */

    'create-single-unused-media': {} as TCreateMedia,
    'create-multiple-unused-media': [] as TCreateMedia[],

    /* ---------------- MEDIA UPDATE JOBS ---------------- */

    'mark-single-media-as-used': {} as TSingleMedia,
    'mark-multiple-media-as-used': {} as Pick<TMultipleMedia, 'publicIds'>,

    /* ---------------- MEDIA DELETE JOBS ---------------- */

    'delete-single-media': {} as TSingleMedia,
    'delete-multiple-media': {} as Pick<TMultipleMedia, 'publicIds'>,
  },
} as const;

/**
 * Default number of jobs a single `JobWorker` processes concurrently.
 *
 * Kept modest by default - callers with I/O-bound jobs (network calls,
 * uploads) should raise this per worker via `IJobWorkerOptions.concurrency`.
 */
export const DEFAULT_WORKER_CONCURRENCY = 5;

/**
 * Default `JobsOptions` applied by `JobProducer` to every queue, merged
 * under any per-call `options` passed to `addJob`/`addBulkJobs`.
 *
 * - Retries failed jobs 3 times with exponential backoff instead of hammering
 *   a possibly-struggling downstream service.
 * - Trims completed/failed jobs so Redis memory doesn't grow unbounded in
 *   long-running production queues - `count` and `age` both apply, whichever
 *   is hit first.
 */
export const DEFAULT_JOB_OPTIONS: JobsOptions = {
  attempts: 3,
  backoff: { type: 'exponential', delay: 1000 },
  removeOnComplete: { count: 1000, age: 24 * 60 * 60 },
  removeOnFail: { count: 5000, age: 7 * 24 * 60 * 60 },
};
