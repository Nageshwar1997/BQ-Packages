/** A deferred unit of work queued via a `res.locals.afterX` hook array. */
export type TAsyncTask = () => Promise<void>;
