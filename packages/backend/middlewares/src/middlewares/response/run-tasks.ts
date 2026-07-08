import type { TAsyncTask } from '../../types/task.js';

/**
 * Runs every queued task to completion via `Promise.allSettled`, so one
 * task failing doesn't stop (or fail) the others.
 *
 * These are deliberately fire-and-forget lifecycle hooks (e.g. "send a
 * webhook after this response finishes") - not part of the request's own
 * success/failure path - so a failing task is logged, never thrown: this
 * function itself never rejects.
 */
export async function runTasks(tasks: TAsyncTask[] | undefined): Promise<void> {
  if (!tasks?.length) {
    return;
  }

  const results = await Promise.allSettled(tasks.map((task) => task()));

  for (const result of results) {
    if (result.status === 'rejected') {
      console.error('[backend-middlewares] a deferred task failed:', result.reason);
    }
  }
}
