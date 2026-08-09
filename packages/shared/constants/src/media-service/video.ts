import { MB } from './common.js';

export const MAX_VIDEO_SIZE = MB * 10; // 10MB

export const VIDEO_MIMES = [
  'video/mp4',
  'video/webm',
  'video/quicktime', // mov
  'video/x-matroska', // mkv
  'video/matroska', // mkv
  'video/ogg', // ogg
  'application/vnd.apple.mpegurl', // m3u8
  'application/x-mpegURL', // m3u8 fallback
] as const;

export const VIDEO_FORMATS = ['mp4', 'webm', 'mov', 'mkv', 'ogg', 'm3u8'] as const;
