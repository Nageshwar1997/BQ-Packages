export const KB = 1024 as const; // 1KB
export const MB = KB ** 2; // 1MB
export const GB = KB ** 3; // 1GB

export const MAX_IMAGE_SIZE = MB * 2; // 2MB
export const MAX_VIDEO_SIZE = MB * 10; // 10MB

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

export const VIDEO_FORMATS = ['mp4', 'webm', 'mov', 'mkv', 'ogg', 'm3u8'] as const;
