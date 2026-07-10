import type { TAsyncTask } from '@beautinique/backend-utils';

import type { ISendSuccessOptions } from './successResponse.js';

/**
 * `res.locals` fields used by `tryCatch` to queue deferred lifecycle hooks
 * (work to run after the response is sent), and `res.success(...)`,
 * attached by `successResponse`. Augmenting Express's own `Locals`/
 * `Response` interfaces here - rather than typing these as `any` - means
 * every route handler in a consuming service gets full type-checking and
 * autocomplete, with no casting required.
 *
 * This is a plain (non-type-only) side-effect import in the package entry,
 * specifically so the ambient `declare global` block below is retained in
 * the entry's bundled `.d.ts` - it produces no runtime code (`declare`/
 * `export {}` compile to nothing), it just needs to be reachable from the
 * entry for the type-only bundler to include it.
 */
declare global {
  // `namespace` is how `@types/express` itself declares `Express` - the
  // only way to merge additional properties into it is to reopen the same
  // namespace, there is no ES2015-module equivalent for this.
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Locals {
      /** Tasks run after a `tryCatch` handler resolves successfully. */
      afterResponse?: TAsyncTask[];
      /** Tasks run after the handler fails. */
      afterRollback?: TAsyncTask[];
      /** Tasks run once the HTTP response has fully finished sending - always, success or failure. */
      afterFinish?: TAsyncTask[];
    }

    interface Response {
      /** Sends a consistent `{ success: true, ... }` JSON response. Attached by `successResponse`. */
      success?: <T = unknown>(options?: ISendSuccessOptions<T>) => void;
    }
  }
}

export {};
