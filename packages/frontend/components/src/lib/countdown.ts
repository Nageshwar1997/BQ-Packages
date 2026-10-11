/**
 * A number of seconds to wait as a whole number that is never negative. A value that is not a number
 * of seconds (`NaN`, `Infinity`, a negative one) is no wait at all: a countdown that cannot end would
 * lock the button for good.
 */
export const toSeconds = (seconds: number) =>
  Number.isFinite(seconds) ? Math.max(Math.ceil(seconds), 0) : 0;

/**
 * The whole seconds left until `endsAt` (a time in ms, as `Date.now()` gives), counted up: 0.2 s left
 * is shown as 1, so the countdown shows 0 only once it is over.
 */
export const getSecondsLeft = (endsAt: number, now: number) =>
  Math.max(Math.ceil((endsAt - now) / 1000), 0);

export const isPromiseLike = (value: unknown): value is PromiseLike<unknown> =>
  typeof value === 'object' &&
  value !== null &&
  'then' in value &&
  typeof value.then === 'function';
