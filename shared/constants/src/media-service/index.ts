export const KB = 1024 as const; // 1KB
export const MB = KB ** 2; // 1MB
export const GB = KB ** 3; // 1GB

export const MAX_SIZE = {
  IMAGE: MB * 2, // 2MB
  VIDEO: MB * 50, // 50MB
};

export const FILE_MIME = {
  image: [
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/jpg',
    'image/svg+xml',
    'image/avif',
    'image/gif',
    'image/heic',
    'image/heif',
  ],
  video: [
    'video/mp4',
    'video/webm',
    'video/quicktime', // mov
    'video/x-matroska', // mkv
    'video/matroska', // mkv
    'video/ogg', // ogg
    'application/vnd.apple.mpegurl', // m3u8
    'application/x-mpegURL', // m3u8 fallback
  ],
} as const;

export const FILE_FORMAT = {
  image: ['jpg', 'jpeg', 'png', 'webp', 'avif', 'gif', 'svg', 'heic', 'heif'],
  video: ['mp4', 'webm', 'mov', 'mkv', 'ogg', 'm3u8'],
} as const;
