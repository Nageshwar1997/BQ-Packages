import type { TEmailZodSchema, TOtpZodSchema, TUserRole } from '@beautinique/backend-types';
import type { JobsOptions } from 'bullmq';

import type {
  IAdminStatusChangeNotification,
  IContactAcknowledgement,
  IContactAdminNotification,
  ICreateMedia,
  IMultipleMedia,
  ISellerAdminAssigned,
  ISellerAssignedNotification,
  ISingleMedia,
  ITerritoryStatusChanged,
} from '../types/index.js';

export const QUEUE_SCHEMA = {
  /* ---------------- MAIL SERVICE QUEUES ---------------- */
  'mail-service-queue': {
    /* ---------------- MAIL JOBS ---------------- */
    'send-otp': {} as TOtpZodSchema & TEmailZodSchema,

    /* ---------------- CONTACT JOBS ---------------- */
    'send-contact-acknowledgement': {} as IContactAcknowledgement,
    'send-contact-admin-notification': {} as IContactAdminNotification,

    /* ---------------- ADMIN TERRITORY JOBS ---------------- */
    'send-seller-assigned-notification': {} as ISellerAssignedNotification,
    'send-admin-status-change-notification': {} as IAdminStatusChangeNotification,
  },

  /* ---------------- MEDIA SERVICE QUEUES ---------------- */
  'media-service-queue': {
    /* ---------------- CLOUDINARY JOBS ---------------- */

    'remove-single-media-directly': {} as ISingleMedia,
    'remove-multiple-media-directly': {} as IMultipleMedia,

    /* ---------------- MEDIA CREATE JOBS ---------------- */

    'create-single-unused-media': {} as ICreateMedia,
    'create-multiple-unused-media': [] as ICreateMedia[],

    /* ---------------- MEDIA UPDATE JOBS ---------------- */

    'mark-single-media-as-used': {} as ISingleMedia,
    'mark-multiple-media-as-used': {} as Pick<IMultipleMedia, 'publicIds'>,

    /* ---------------- MEDIA DELETE JOBS ---------------- */

    'delete-single-media': {} as ISingleMedia,
    'delete-multiple-media': {} as Pick<IMultipleMedia, 'publicIds'>,
  },

  /* ---------------- USER SERVICE QUEUES ---------------- */
  'user-service-queue': {
    /* ---------------- USER JOBS ---------------- */
    'update-role': {} as { role: TUserRole; userId: string },
  },

  /* ---------------- ORGANIZATION SERVICE QUEUES ---------------- */
  'organization-service-queue': {
    /* ---------------- ADMIN TERRITORY JOBS ---------------- */
    // Produced by user-service whenever an `AdminProfile`'s status changes.
    // organization-service is the sole consumer - it's the one that owns
    // `Seller.assignedAdmin` and has to react by reassigning that state's
    // in-flight PENDING sellers. See `ITerritoryStatusChanged`.
    'territory-status-changed': {} as ITerritoryStatusChanged,
  },

  /* ---------------- PRODUCT SERVICE QUEUES ---------------- */
  'product-service-queue': {
    /* ---------------- ADMIN TERRITORY JOBS ---------------- */
    // Produced by organization-service after it resolves+stamps
    // `Seller.assignedAdmin`. Lets product-service cache "this seller's
    // products route to this admin" without re-resolving state->admin
    // itself. See `ISellerAdminAssigned`.
    'seller-admin-assigned': {} as ISellerAdminAssigned,
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
