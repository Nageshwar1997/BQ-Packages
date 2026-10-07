import { useCallback, useLayoutEffect, useMemo, useRef } from 'react';

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
 * - Several updates in a row (before React re-renders) build on each other, like `setState`
 *   updaters do.
 * - A param an update does not touch keeps all its values (`?tag=a&tag=b`) and its position.
 * - Each update navigates to the same pathname with the new `search`, as a new history entry unless
 *   `{ replace: true }` is passed. An update that would leave the query string unchanged does not
 *   navigate at all. The hash and the location `state` are not kept.
 *
 * Needs to be rendered inside a React Router (`react-router-dom`) router.
 */
export const useQueryParams = () => {
  const { navigate, search, pathname } = usePathParams();

  // The query string updates are built on. It is the committed URL after every render; an update
  // moves it forward immediately, so a second update in the same tick (before the router has
  // re-rendered) starts from the first one's result instead of from the old URL.
  const searchRef = useRef(search);

  useLayoutEffect(() => {
    searchRef.current = search;
  });

  const queryParams = useMemo(() => parseParams(search), [search]);

  const setParams = useCallback(
    (params: TParamsUpdate, options?: IQueryParamsUpdateOptions): void => {
      const currentSearch = searchRef.current;
      const nextSearch = buildSearch(currentSearch, params);

      // Nothing would change: don't add a duplicate entry for the very same URL.
      if (nextSearch === normalizeSearch(currentSearch)) return;

      searchRef.current = nextSearch;
      void navigate({ pathname, search: nextSearch }, { replace: options?.replace });
    },
    [navigate, pathname],
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
      if (normalizeSearch(searchRef.current) === '') return;

      searchRef.current = '';
      void navigate({ pathname, search: '' }, { replace: options?.replace });
    },
    [navigate, pathname],
  );

  return {
    queryParams,
    setParams,
    removeParams,
    clearParams,
  };
};

export type { TParamsUpdate };
