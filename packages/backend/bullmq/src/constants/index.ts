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
