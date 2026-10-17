import { formatFileSize } from '@beautinique/shared-utils';

import type { QuillEditorError } from './types.js';

/**
 * Words for something the editor did not allow, ready for a toast or a message under the field.
 *
 * @example
 * <QuillEditor onError={(error) => toaster.error(describeQuillEditorError(error))} />
 */
export const describeQuillEditorError = (
  error: QuillEditorError,
): { title: string; description: string } => {
  switch (error.type) {
    case 'image-too-large':
      return {
        title: 'File size limit exceeded',
        description: `Image size is ${formatFileSize(error.size)}. Max allowed size is ${formatFileSize(error.maxSize)}.`,
      };

    case 'image-invalid-type':
      return {
        title: 'Invalid file type',
        description: `File extension is .${error.extension ?? 'unknown'}. Allowed extensions are ${error.allowedFormats.join(', ')}.`,
      };

    case 'image-not-allowed':
      return {
        title: 'You cannot copy, drag & drop images here.',
        description: 'Please upload it using the upload image button.',
      };
  }
};
