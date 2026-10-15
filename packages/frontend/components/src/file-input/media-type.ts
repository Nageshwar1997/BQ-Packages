import type { TMediaResource } from '../media/index.js';

// The endings of an address of a video. Anything else is taken for a picture.
const VIDEO_EXTENSIONS: ReadonlySet<string> = new Set([
  'avi',
  'm3u8',
  'm4v',
  'mkv',
  'mov',
  'mp4',
  'ogg',
  'ogv',
  'webm',
]);

/**
 * Whether a file or an address is a picture or a video. A file says it with its type (`video/mp4`);
 * an address says it with its ending (`.mp4`, also before a `?` or a `#`). What is not known is a
 * picture, so a preview is always drawn.
 */
export const getMediaType = (value: File | string): TMediaResource => {
  if (typeof value !== 'string') return value.type.startsWith('video/') ? 'video' : 'image';

  const path = value.split(/[?#]/, 1).at(0) ?? '';
  const extension = /\.([a-z0-9]+)$/i.exec(path)?.at(1)?.toLowerCase() ?? '';

  return VIDEO_EXTENSIONS.has(extension) ? 'video' : 'image';
};
