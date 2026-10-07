import { normalizeSearch } from './query-string.js';

/**
 * The query string that `useQueryParams` has navigated to but the router has not committed yet.
 *
 * With a data router (`createBrowserRouter`) `navigate()` finishes asynchronously: the new URL only
 * shows up a few ms later. Until then, every `useQueryParams()` on the page - however many components
 * use it - must build its next update on the pending one, not on the old URL, or the updates
 * overwrite each other (status picked in one component, search typed in another...). So the pending
 * query string is kept here, shared by all instances, instead of inside each hook.
 *
 * It lives only for the moment between "navigate called" and "router committed it". Updates are made
 * from event handlers and timers, never while rendering, so nothing here runs on the server.
 */
interface IPendingSearch {
  pathname: string;
  search: string;
  startedAt: number;
}

/** A navigation that has not committed after this long is assumed lost; the router's URL is trusted again. */
export const PENDING_SEARCH_MAX_AGE_MS = 2000;

let pending: IPendingSearch | null = null;

/** The query string a navigation on `pathname` is on its way to, or `null` when none is in flight. */
export const readPendingSearch = (pathname: string): string | null => {
  if (!pending) return null;

  if (pending.pathname !== pathname || Date.now() - pending.startedAt > PENDING_SEARCH_MAX_AGE_MS) {
    return null;
  }

  return pending.search;
};

/** Remember that a navigation to `search` (on `pathname`) has just been started. */
export const setPendingSearch = (pathname: string, search: string): void => {
  pending = { pathname, search, startedAt: Date.now() };
};

/**
 * Call with the router's committed URL: once it is the one we were navigating to, the navigation is
 * done and the router's URL is the truth again. A different URL (an older navigation committing, the
 * user pressing Back...) leaves the pending one alone: a newer update may still be on its way.
 */
export const settlePendingSearch = (pathname: string, committedSearch: string): void => {
  if (
    pending?.pathname === pathname &&
    normalizeSearch(pending.search) === normalizeSearch(committedSearch)
  ) {
    pending = null;
  }
};

/** For tests: forget any pending navigation. */
export const resetPendingSearch = (): void => {
  pending = null;
};
