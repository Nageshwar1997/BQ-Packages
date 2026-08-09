import type { TAsyncTask } from '@beautinique/backend-utils';

/**
 * `res.locals` fields used by `tryCatchSession` to queue deferred
 * lifecycle hooks (work to run after the transaction commits/rolls back,
 * or after the response is sent). Augmenting Express's own `Locals`
 * interface here - rather than typing these as `any` - means every route
 * handler in a consuming service gets full type-checking and autocomplete,
 * with no casting required.
 *
 * Declared self-contained (not assuming `@beautinique/backend-response` is
 * also installed) - `afterRollback`/`afterResponse`/`afterFinish` overlap
 * with that package's own `globals.ts`, but re-declaring the same optional
 * field with the same type from two packages is a no-op for TypeScript's
 * interface merging, not a conflict.
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
      /** Tasks run after a `tryCatchSession` transaction commits. */
      afterCommit?: TAsyncTask[];
      /** Tasks run after the handler fails (or the transaction aborts). */
      afterRollback?: TAsyncTask[];
      /** Tasks run after a `tryCatchSession` handler resolves successfully (in addition to `afterCommit`). */
      afterResponse?: TAsyncTask[];
      /** Tasks run once the HTTP response has fully finished sending - always, success or failure. */
      afterFinish?: TAsyncTask[];
    }
  }
}

export {};
