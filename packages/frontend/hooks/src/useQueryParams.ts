import { useCallback, useLayoutEffect, useMemo, useRef } from 'react';

import { readPendingSearch, setPendingSearch, settlePendingSearch } from './pending-search.js';
import { buildSearch, normalizeSearch, parseParams, type TParamsUpdate } from './query-string.js';
import { usePathParams } from './usePathParams.js';

export type { TStringRecord } from './query-string.js';

export interface IQueryParamsUpdateOptions {
  /**
   * Replace the current history entry instead of adding a new one, so the browser's Back button
   * does not return to the URL being replaced. Use it for updates that are not a step the user
   * should be able to go back to - e.g. closing a modal that was opened through a query param.
   *
   * @default false
   */
  replace?: boolean;
}

/**
 * Read and update the URL query string (`?a=1&b=2`) of the current route.
 *
 * - `queryParams`: the current params as an object (a repeated key keeps its last value). It only
 *   changes identity when the URL's query string changes, so it is safe in dependency arrays.
 * - `setParams`: merges the given params into the current ones (or pass an updater function to
 *   build the next params from the previous). `''`, `null` and `undefined` values are dropped from
 *   the URL.
 * - `removeParams`: removes one key or a list of keys.
 * - `clearParams`: removes every param.
 *
 * Updates:
 * - Several updates in a row build on each other, like `setState` updaters do - also when they come
 *   from different components that each call `useQueryParams()`, and also while the router has not
 *   finished the previous navigation yet (with a data router that takes a few ms).
 * - A param an update does not touch keeps all its values (`?tag=a&tag=b`) and its position.
 * - Each update navigates to the same pathname with the new `search`, as a new history entry unless
 *   `{ replace: true }` is passed. An update that would leave the query string unchanged does not
 *   navigate at all. The hash and the location `state` are not kept.
 *
 * Needs to be rendered inside a React Router (`react-router-dom`) router.
 */
export const useQueryParams = () => {
  const { navigate, search, pathname } = usePathParams();

  // The router's committed query string, as of the latest render. Used when no update of ours is
  // still waiting to be committed (see `pending-search.ts`, which tracks those).
  const committedSearchRef = useRef(search);

  useLayoutEffect(() => {
    committedSearchRef.current = search;
  });

  // Once the router shows the URL we navigated to, that navigation is finished.
  useLayoutEffect(() => {
    settlePendingSearch(pathname, search);
  }, [pathname, search]);

  const queryParams = useMemo(() => parseParams(search), [search]);

  const currentSearch = useCallback(
    () => readPendingSearch(pathname) ?? committedSearchRef.current,
    [pathname],
  );

  const setParams = useCallback(
    (params: TParamsUpdate, options?: IQueryParamsUpdateOptions): void => {
      const current = currentSearch();
      const nextSearch = buildSearch(current, params);

      // Nothing would change: don't add a duplicate entry for the very same URL.
      if (nextSearch === normalizeSearch(current)) return;

      setPendingSearch(pathname, nextSearch);
      void navigate({ pathname, search: nextSearch }, { replace: options?.replace });
    },
    [currentSearch, navigate, pathname],
  );

  const removeParams = useCallback(
    (keys: string | string[], options?: IQueryParamsUpdateOptions): void => {
      const keysToRemove = new Set(Array.isArray(keys) ? keys : [keys]);

      setParams(
        (prevParams) =>
          Object.fromEntries(Object.entries(prevParams).filter(([key]) => !keysToRemove.has(key))),
        options,
      );
    },
    [setParams],
  );

  const clearParams = useCallback(
    (options?: IQueryParamsUpdateOptions): void => {
      if (normalizeSearch(currentSearch()) === '') return;

      setPendingSearch(pathname, '');
      void navigate({ pathname, search: '' }, { replace: options?.replace });
    },
    [currentSearch, navigate, pathname],
  );

  return {
    queryParams,
    setParams,
    removeParams,
    clearParams,
  };
};
