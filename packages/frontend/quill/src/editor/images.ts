import { nanoid } from 'nanoid';
import type Quill from 'quill';
import type { Delta } from 'quill';
import type { RefObject } from 'react';

import type { QuillEditorError, QuillImageRef } from './types.js';

/** What an image may be to be picked. */
export interface QuillImageRules {
  /** The biggest image in bytes. */
  maxSize: number;
  /** The image types (MIME) that may be picked. */
  mimes: readonly string[];
  /** The file extensions that may be picked, in lower case, without the dot. */
  formats: readonly string[];
}

/**
 * The files of the images an editor is holding on to, in the order they were picked.
 *
 * @param images The images the editor holds (its `imagesRef.current`).
 */
export const getQuillImageFiles = (images: readonly QuillImageRef[]): File[] =>
  images.map(({ file }) => file);

/**
 * Says what is wrong with a file picked for the editor, if anything is.
 *
 * @returns The error (too big first, then the wrong type), or `null` if the file may be used.
 */
export const validateImageFile = (
  file: File,
  { maxSize, mimes, formats }: QuillImageRules,
): QuillEditorError | null => {
  if (file.size > maxSize) {
    return { type: 'image-too-large', file, size: file.size, maxSize };
  }

  // A name without a dot has no extension (its whole name is not one)
  const extension = file.name.includes('.') ? file.name.split('.').pop()?.toLowerCase() : undefined;

  if (!mimes.includes(file.type) || !extension || !formats.includes(extension)) {
    return { type: 'image-invalid-type', file, extension, allowedFormats: formats };
  }

  return null;
};

/**
 * Opens the file picker; the image that is picked goes into the editor at the cursor (at the end if
 * there is none), shown from a `blob:` address, and its file is added to `imagesRef` to be uploaded
 * when the content is saved. A file that is not allowed is reported with `onError` and not inserted.
 */
export const insertImageIntoQuill = (
  quill: Quill,
  imagesRef: RefObject<QuillImageRef[]>,
  rules: QuillImageRules,
  onError?: (error: QuillEditorError) => void,
): void => {
  const input = document.createElement('input');

  input.type = 'file';
  input.accept = rules.mimes.join(', ');

  input.addEventListener(
    'change',
    () => {
      const file = input.files?.[0];

      if (!file) {
        return;
      }

      const error = validateImageFile(file, rules);

      if (error) {
        onError?.(error);

        return;
      }

      const range = quill.getSelection() ?? {
        index: Math.max(quill.getLength() - 1, 0),
        length: 0,
      };
      const image: QuillImageRef = { id: nanoid(), file, blobUrl: URL.createObjectURL(file) };

      imagesRef.current.push(image);

      quill.insertEmbed(
        range.index,
        'image',
        { src: image.blobUrl, alt: file.name || 'Image', id: image.id },
        'user',
      );

      // Silent: with a source that is heard, the cursor can jump to the end of the text
      quill.setSelection(range.index + 1, 0, 'silent');
    },
    { once: true },
  );

  input.click();
};

/**
 * The held images that are in the text now (not the ones that were deleted from it), in the order they were
 * picked. A deleted image stays held: an undo brings it back, and its `blob:` address must still work then.
 *
 * @param quill The editor.
 * @param images The images the editor holds (its `imagesRef.current`).
 */
export const getQuillImagesInText = (
  quill: Quill,
  images: readonly QuillImageRef[],
): QuillImageRef[] => {
  const idsInText = new Set(
    Array.from(quill.root.querySelectorAll('img'), (img) => img.getAttribute('data-image-id')),
  );

  return images.filter(({ id }) => idsInText.has(id));
};

/** Whether an image may be shown: one from this device (`blob:`), or one from an allowed host over http(s). */
const isAllowedImageSource = (src: string, hosts: readonly string[]): boolean => {
  if (src.startsWith('blob:')) {
    return true;
  }

  try {
    const url = new URL(src);

    return (url.protocol === 'https:' || url.protocol === 'http:') && hosts.includes(url.hostname);
  } catch {
    return false;
  }
};

/**
 * Whether a change put an image into the text that does not come from the image button: one dragged,
 * dropped or pasted in from another site, or one that has no address.
 */
export const hasForbiddenImage = (delta: Delta, hosts: readonly string[]): boolean =>
  delta.ops.some((op) => {
    if (!op.insert || typeof op.insert !== 'object' || !('image' in op.insert)) {
      return false;
    }

    const image = op.insert.image as string | { src?: string } | undefined;
    const src = typeof image === 'string' ? image : image?.src;

    return !src || !isAllowedImageSource(src, hosts);
  });
