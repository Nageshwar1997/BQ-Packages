import { createError, ErrorBuilder } from '@beautinique/backend-classes';
import type { RequestHandler } from 'express';

import type { IMulterValidation } from './types/index.js';
import {
  collectCustomErrors,
  collectMulterErrors,
  createMulterUpload,
  getRequestFiles,
} from './utils/index.js';

export const validateMulter = ({
  type,
  fieldName,
  maxCount,
  fieldsConfig,
  limits,
  format,
  size,
  isDev = false,
}: IMulterValidation): RequestHandler => {
  const upload = createMulterUpload({ type, fieldName, maxCount, fieldsConfig, limits });

  return (req, res, next) => {
    upload(req, res, (error) => {
      const errors = new ErrorBuilder();

      // ===== Multer Internal Validation =====
      collectMulterErrors(errors, { error, fieldName, maxCount }, isDev);

      // If Multer itself failed, stop immediately.
      if (!errors.isEmpty()) {
        next(
          createError({
            message: error instanceof Error ? error.message : 'File upload failed.',
            payload: errors,
          }),
        );
        return;
      }

      // ===== Custom Validation =====
      collectCustomErrors(errors, { files: getRequestFiles(req, type), format, size });

      if (!errors.isEmpty()) {
        next(createError({ message: 'File validation failed.', payload: errors }));
        return;
      }

      next();
    });
  };
};

export type { IMulterValidation } from './types/index.js';
