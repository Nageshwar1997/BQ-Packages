import { IMAGE_FORMATS, IMAGE_MIMES, MB } from '@beautinique/frontend-constants';
import type { TImageFormat, TImageMime } from '@beautinique/frontend-types';
import { formatFileSize } from '@beautinique/shared-utils';
import { useEffect, useState } from 'react';

import type { ITryOnError } from '../../types/index.js';

export const TRYON_MAX_PHOTO_SIZE = 5 * MB;

// Upload-mode file handling for the Try-On flow: size/mime/extension validation, and the
// `URL.createObjectURL`/`revokeObjectURL` preview lifecycle.
//
// A rejected photo is told to `onReject` when the app gave one (the Client shows it as a toast: the
// toaster is app-wide and sits above the modal); without one it is kept in `error`, for the modal to
// show where the photo is chosen.
const useTryOnUpload = (onReject?: (error: ITryOnError) => void) => {
  const [file, setFileState] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<ITryOnError | null>(null);

  useEffect(() => {
    if (!file) {
      /**
       * previewUrl is derived from URL.createObjectURL(), an external-system side effect
       * unsafe to run during render, so this branch can't be computed with a plain useMemo.
       */
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPreviewUrl(null);
      return;
    }

    const url = URL.createObjectURL(file);
    setPreviewUrl(url);

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [file]);

  const reject = (rejection: ITryOnError) => {
    if (onReject) {
      onReject(rejection);
    } else {
      setError(rejection);
    }

    return false;
  };

  // Returns whether `candidate` was actually accepted - the caller (TryOnModal) needs this to
  // know whether it's safe to advance the flow into the 'tryon' step, which mounts the engine
  // against `file`/`previewUrl` - advancing on a rejected file would mount it against nothing,
  // stuck showing a "processing..." loading overlay forever since no image ever arrives, right
  // alongside the rejection message.
  const setFile = (candidate: File): boolean => {
    if (candidate.size > TRYON_MAX_PHOTO_SIZE) {
      return reject({
        title: 'Photo is too large',
        description: `This photo is ${formatFileSize(candidate.size)}. Please choose one under ${formatFileSize(TRYON_MAX_PHOTO_SIZE)}.`,
      });
    }

    const ext = candidate.name.split('.').pop()?.toLowerCase();

    if (
      !IMAGE_MIMES.includes(candidate.type as TImageMime) ||
      !ext ||
      !IMAGE_FORMATS.includes(ext as TImageFormat)
    ) {
      return reject({
        title: 'Unsupported photo type',
        description: `.${ext ?? 'unknown'} files aren't supported. Please use ${IMAGE_FORMATS.join(', ')}.`,
      });
    }

    setError(null);
    setFileState(candidate);
    return true;
  };

  const reset = () => {
    setFileState(null);
  };

  const clearError = () => {
    setError(null);
  };

  return { file, previewUrl, error, setFile, reset, clearError };
};

export default useTryOnUpload;
