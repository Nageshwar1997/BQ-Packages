import { ValidationError } from '@beautinique/backend-classes';
import type { RequestHandler } from 'express';

import type { IRequestCheckOptions } from './types.js';

/**
 * `true` when `value` is missing, or is an object/array with no own keys
 * (covers `req.body`, `req.file`, `req.files` - single object, array, or
 * multer's `{ [fieldname]: File[] }` shape - and `req.params`/`req.query`).
 */
function isEmptyValue(value: unknown): boolean {
  return !value || (typeof value === 'object' && Object.keys(value).length === 0);
}

/**
 * Rejects requests that are missing required parts, before they ever reach
 * a route handler.
 *
 * Every flag in `options` is opt-in (all default to not required), so an
 * empty `{}` allows any request through unchanged. When multiple flags are
 * combined, checks are evaluated in the order below and the first
 * violation wins (later checks are skipped once one throws).
 *
 * @param options - Which parts of the request must be present.
 * @returns An Express request handler that calls `next(error)` with a
 * `ValidationError` on the first failed check, or `next()` otherwise.
 */
export const checkEmptyRequest = (options: IRequestCheckOptions): RequestHandler => {
  const { body, file, files, fileOrBody, filesOrBody, params, query } = options;

  return (req, _res, next) => {
    try {
      const isBodyEmpty = isEmptyValue(req.body);
      const isFileEmpty = isEmptyValue(req.file);
      const isFilesEmpty = isEmptyValue(req.files);
      const isParamsEmpty = isEmptyValue(req.params);
      const isQueryEmpty = isEmptyValue(req.query);

      // Case 1: body or files (plural) required, both empty
      if (filesOrBody && !file && isBodyEmpty && isFilesEmpty) {
        throw new ValidationError('Please provide some data in the body or files!');
      }

      // Case 2: body or a single file required, both empty
      if (fileOrBody && !files && isBodyEmpty && isFileEmpty) {
        throw new ValidationError('Please provide some data in the body or file!');
      }

      // Case 3: only body required, empty
      if (!files && !file && body && isBodyEmpty) {
        throw new ValidationError('Please provide some data in the body!');
      }

      // Case 4: only files (plural) required, empty
      if (files && !file && !body && isFilesEmpty) {
        throw new ValidationError('Please provide some files!');
      }

      // Case 5: only a single file required, empty
      if (file && !files && !body && isFileEmpty) {
        throw new ValidationError('Please provide a file!');
      }

      // Case 6: params required, empty
      if (params && isParamsEmpty) {
        throw new ValidationError('Please provide some params!');
      }

      // Case 7: query required, empty
      if (query && isQueryEmpty) {
        throw new ValidationError('Please provide some query!');
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};
