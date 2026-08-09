import { MB } from './common.js';

export const MAX_IMAGE_SIZE = MB * 2; // 2MB

export const IMAGE_MIMES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/jpg',
  'image/svg+xml',
  'image/avif',
  'image/gif',
  'image/heic',
  'image/heif',
] as const;

export const IMAGE_FORMATS = [
  'jpg',
  'jpeg',
  'png',
  'webp',
  'avif',
  'gif',
  'svg',
  'heic',
  'heif',
] as const;
