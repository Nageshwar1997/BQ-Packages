export const KB = 1024; // 1KB
export const MB = KB ** 2; // 1MB
export const GB = KB ** 3; // 1GB

export const MAX_IMAGE_SIZE = MB * 2; // 2MB
export const MAX_VIDEO_SIZE = MB * 10; // 2MB


export const FILE_MIME = {
  IMAGE: ['image/jpeg', 'image/png', 'image/webp', 'image/jpg', 'image/svg+xml'],
  VIDEO: ['video/mp4', 'video/webm'],
} as const;