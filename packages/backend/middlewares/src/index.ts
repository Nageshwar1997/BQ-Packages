/**
 * @beautinique/backend-middlewares
 *
 * Base entry - `checkEmptyRequest`, `serviceAccess`, and `tryCatch`. None
 * of these depend on `cors` or `mongoose`, so this entry is always safe
 * to import, even in a database-less service like an API gateway.
 *
 * For CORS handling, import from `@beautinique/backend-middlewares/cors`
 * instead (needs the optional `cors` peer dependency). For mongoose
 * transaction handling, import from
 * `@beautinique/backend-middlewares/session` instead (needs the optional
 * `mongoose` peer dependency). Both are kept as separate entry points so
 * their types never leak into this one - a consumer that only ever
 * imports from here never needs `cors`'s or `mongoose`'s types
 * resolvable at all.
 */
import './types/globals.js';

export * from './middlewares/request.js';
export * from './middlewares/response/tryCatch.js';
export type { IRequestCheckOptions, IServiceAccessOptions } from './types/request.js';
export type { TAsyncRequestHandler } from './types/response.js';
export type { TAsyncTask } from './types/task.js';
