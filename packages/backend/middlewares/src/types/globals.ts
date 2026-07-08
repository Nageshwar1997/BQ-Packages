import type { TAsyncTask } from './task.js';

/**
 * `res.locals` fields used by `tryCatch`/`tryCatchSession` to queue
 * deferred lifecycle hooks (work to run after the response is sent, or
 * after a transaction commits/rolls back). Augmenting Express's own
 * `Locals` interface here - rather than typing these as `any` - means
 * every route handler in a consuming service gets full type-checking and
 * autocomplete on `res.locals.afterX`, with no casting required.
 *
 * This is a plain (non-type-only) side-effect import in every entry file
 * that needs it, specifically so the ambient `declare global` block below
 * is retained in each entry's bundled `.d.ts` - it produces no runtime
 * code (`declare`/`export {}` compile to nothing), it just needs to be
 * reachable from the entry for the type-only bundler to include it.
 */
declare global {
  // `namespace` is how `@types/express` itself declares `Express` - the
  // only way to merge additional properties into it is to reopen the same
  // namespace, there is no ES2015-module equivalent for this.
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Locals {
      /** Tasks run after a `tryCatch`/`tryCatchSession` handler resolves successfully. */
      afterResponse?: TAsyncTask[];
      /** Tasks run after the handler fails (or, in `tryCatchSession`, after the transaction aborts). */
      afterRollback?: TAsyncTask[];
      /** Tasks run after a `tryCatchSession` transaction commits. */
      afterCommit?: TAsyncTask[];
      /** Tasks run once the HTTP response has fully finished sending - always, success or failure. */
      afterFinish?: TAsyncTask[];
    }
  }
}

export {};
