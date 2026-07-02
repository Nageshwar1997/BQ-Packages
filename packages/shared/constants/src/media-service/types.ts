import type { IMAGE_FORMATS, IMAGE_MIMES, VIDEO_FORMATS, VIDEO_MIMES } from './index.js';

export type TImageMime = (typeof IMAGE_MIMES)[number];
export type TVideoMime = (typeof VIDEO_MIMES)[number];

export type TImageFormat = (typeof IMAGE_FORMATS)[number];
export type TVideoFormat = (typeof VIDEO_FORMATS)[number];
