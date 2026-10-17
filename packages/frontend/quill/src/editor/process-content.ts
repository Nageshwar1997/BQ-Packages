import type Quill from 'quill';
import type { RefObject } from 'react';

import { sanitizeQuillHtml } from '../viewer/sanitize.js';
import { getQuillImageFiles, getQuillImagesInText } from './images.js';
import type { QuillImageRef } from './types.js';

/** What the editor writes for a text with nothing in it. */
const EMPTY_QUILL_HTML = '<p><br></p>';

/** The upload did not give back one address for each image, so which image is which is not known. */
export class QuillUploadCountError extends Error {
  /** How many images were sent. */
  readonly expected: number;
  /** How many addresses came back. */
  readonly received: number;

  constructor(expected: number, received: number) {
    super(`Expected ${String(expected)} uploaded files, got ${String(received)}.`);
    this.name = 'QuillUploadCountError';
    this.expected = expected;
    this.received = received;
  }
}

/**
 * The HTML of an editor as it is saved: cleaned (see `sanitizeQuillHtml`), and `undefined` for a text
 * with nothing in it (the editor writes `<p><br></p>` for that).
 */
export const getQuillContent = (html: string): string | undefined =>
  !html || html === EMPTY_QUILL_HTML ? undefined : sanitizeQuillHtml(html);

export interface ProcessQuillContentOptions {
  quill: Quill;
  /** The same ref the editor was given as `imagesRef`. */
  imagesRef: RefObject<QuillImageRef[]>;
  /**
   * Uploads the files and gives back one address for each, in the same order. Called once, with all
   * the files, and only if there are some.
   */
  upload: (files: File[]) => Promise<readonly (string | null | undefined)[]>;
}

/**
 * Makes the content of the editor ready to be saved: uploads the images that were picked (and are
 * still in the text), puts their addresses where the `blob:` addresses were, lets go of the blobs, and
 * gives back the cleaned HTML (`undefined` if the text is empty).
 *
 * If the upload fails, or does not give an address for each image, nothing is changed - the images
 * stay in the editor and the call can be repeated.
 *
 * @throws {QuillUploadCountError} when the number of addresses is not the number of images.
 *
 * @example
 * const html = await processQuillContent({
 *   quill: quillRef.current,
 *   imagesRef,
 *   upload: (files) => uploadToCloud(files, 'products'),
 * });
 */
export const processQuillContent = async ({
  quill,
  imagesRef,
  upload,
}: ProcessQuillContentOptions): Promise<string | undefined> => {
  const held = imagesRef.current;
  // Only what is in the text now is uploaded: an image that was deleted from it is not
  const inText = getQuillImagesInText(quill, held);
  const files = getQuillImageFiles(inText);

  if (files.length === 0) {
    return getQuillContent(quill.root.innerHTML);
  }

  const urls = (await upload(files)).filter((url): url is string => Boolean(url));

  if (urls.length !== files.length) {
    throw new QuillUploadCountError(files.length, urls.length);
  }

  let html = quill.root.innerHTML;

  inText.forEach(({ blobUrl }, index) => {
    html = html.split(blobUrl).join(urls[index]);
  });

  // Quill reads the new addresses now and says nothing about it: this is not a change to report, and
  // the addresses of the upload are not images a person added (which the editor would check)
  quill.root.innerHTML = html;
  quill.update('silent');
  // The text before the upload has `blob:` addresses that are about to stop working: an undo must not
  // bring them back
  quill.history.clear();

  // Every held image, also the ones that were deleted from the text and are not needed any more
  for (const { blobUrl } of held) {
    URL.revokeObjectURL(blobUrl);
  }

  held.length = 0;

  return getQuillContent(html);
};
