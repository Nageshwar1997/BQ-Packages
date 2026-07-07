import {
  AuthorizationError,
  InternalServerError,
  ValidationError,
} from '@beautinique/backend-classes';
import type { NextFunction, Request, Response } from 'express';

import type { IRequestCheckOptions, IServiceAccessOptions } from './types/index.js';

export const checkEmptyRequest =
  (options: IRequestCheckOptions) => (req: Request, _: Response, next: NextFunction) => {
    try {
      const { body, file, files, fileOrBody, filesOrBody, params, query } = options;

      // Define emptiness checks for each part of the request
      const isBodyEmpty = !req.body || Object.keys(req.body as object).length === 0;
      const isFileEmpty =
        !req.file || (typeof req.file === 'object' && Object.keys(req.file).length === 0);
      const isFilesEmpty =
        !req.files || (typeof req.files === 'object' && Object.keys(req.files).length === 0);
      const isParamsEmpty = !req.params || Object.keys(req.params).length === 0;
      const isQueryEmpty = !req.query || Object.keys(req.query).length === 0;

      // Case 1: If both body and files are required, and both are empty
      if (filesOrBody && !file && isBodyEmpty && isFilesEmpty) {
        throw new ValidationError('Please provide some data in the body or files!');
      }

      // Case 2: If both body and file are required, and both are empty
      if (fileOrBody && !files && isBodyEmpty && isFileEmpty) {
        throw new ValidationError('Please provide some data in the body or file!');
      }

      // Case 3: If only body is required and is empty
      if (!files && !file && body && isBodyEmpty) {
        throw new ValidationError('Please provide some data in the body!');
      }

      // Case 4: If only files are required and are empty
      if (files && !file && !body && isFilesEmpty) {
        throw new ValidationError('Please provide some files!');
      }

      // Case 5: If only single file is required and is empty
      if (file && !files && !body && isFileEmpty) {
        throw new ValidationError('Please provide some files!');
      }

      // Case 6: If params are required and are empty
      if (params && isParamsEmpty) {
        throw new ValidationError('Please provide some params!');
      }

      // Case 7: If query is required and is empty
      if (query && isQueryEmpty) {
        throw new ValidationError('Please provide some query!');
      }

      next();
    } catch (error) {
      next(error);
    }
  };

export const serviceAccess = ({
  secret,
  headerName = 'X-Service-Secret',
}: IServiceAccessOptions) => {
  if (!secret) {
    throw new InternalServerError('Service secret is not defined');
  }

  return (req: Request, _res: Response, next: NextFunction) => {
    const internalSecret = req.get(headerName)?.trim();

    if (!internalSecret || internalSecret !== secret) {
      throw new AuthorizationError('You are not authorized to access this service');
    }

    next();
  };
};
