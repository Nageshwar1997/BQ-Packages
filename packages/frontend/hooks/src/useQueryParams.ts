import { isNullOrUndefined } from '@beautinique/shared-utils';
import { useCallback, useMemo } from 'react';

import { usePathParams } from './usePathParams.js';

export type TStringRecord = Record<string, string>;

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
 * Each update navigates to the same pathname with the new `search`, as a new history entry unless
 * `{ replace: true }` is passed. An update that would leave the query string unchanged (setting a
 * value that is already there, removing a key that is not there) does not navigate at all. The
 * hash and the location `state` are not kept.
 *
 * Needs to be rendered inside a React Router (`react-router-dom`) router.
 */
export const useQueryParams = () => {
  const { navigate, search, pathname } = usePathParams();

  const getParams = useCallback((): TStringRecord => {
    const searchParams = new URLSearchParams(search);
    const params: TStringRecord = {};

    for (const [key, value] of searchParams.entries()) {
      params[key] = value;
    }

    return params;
  }, [search]);

  const queryParams = useMemo(() => getParams(), [getParams]);

  const setParams = useCallback(
    (
      params: TStringRecord | ((prevParams: TStringRecord) => TStringRecord),
      options?: IQueryParamsUpdateOptions,
    ): void => {
      const currentParams = getParams();

      const updatedParams =
        typeof params === 'function' ? params(currentParams) : { ...currentParams, ...params };

      const searchParams = new URLSearchParams();

      Object.entries(updatedParams).forEach(([key, value]) => {
        if (!isNullOrUndefined(value) && value !== '') {
          searchParams.set(key, value);
        }
      });

      const nextSearch = searchParams.toString();

      // Nothing would change: don't add a duplicate entry for the very same URL.
      if (nextSearch === search.replace(/^\?/, '')) return;

      void navigate({ pathname, search: nextSearch }, { replace: options?.replace });
    },
    [getParams, navigate, pathname, search],
  );

  const removeParams = useCallback(
    (keys: string | string[], options?: IQueryParamsUpdateOptions): void => {
      setParams((prevParams) => {
        const keysToRemove = new Set(Array.isArray(keys) ? keys : [keys]);

        return Object.fromEntries(
          Object.entries(prevParams).filter(([key]) => !keysToRemove.has(key)),
        );
      }, options);
    },
    [setParams],
  );

  const clearParams = useCallback(
    (options?: IQueryParamsUpdateOptions): void => {
      if (search.replace(/^\?/, '') === '') return;

      void navigate({ pathname, search: '' }, { replace: options?.replace });
    },
    [navigate, pathname, search],
  );

  return {
    queryParams,
    setParams,
    removeParams,
    clearParams,
  };
};
