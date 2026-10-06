import { isNullOrUndefined } from '@beautinique/shared-utils';
import { useCallback } from 'react';

import { usePathParams } from './usePathParams.js';

export type TStringRecord = Record<string, string>;

/**
 * Read and update the URL query string (`?a=1&b=2`) of the current route.
 *
 * - `queryParams`: the current params as an object (a repeated key keeps its last value).
 * - `setParams`: merges the given params into the current ones (or pass an updater function to
 *   build the next params from the previous). `''`, `null` and `undefined` values are dropped from
 *   the URL.
 * - `removeParams`: removes one key or a list of keys.
 * - `clearParams`: removes every param.
 *
 * Each update navigates to the same pathname with the new `search` (a new history entry). It does
 * not keep the hash or the location `state`.
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

  const setParams = useCallback(
    (params: TStringRecord | ((prevParams: TStringRecord) => TStringRecord)): void => {
      const currentParams = getParams();

      const updatedParams =
        typeof params === 'function' ? params(currentParams) : { ...currentParams, ...params };

      const searchParams = new URLSearchParams();

      Object.entries(updatedParams).forEach(([key, value]) => {
        if (!isNullOrUndefined(value) && value !== '') {
          searchParams.set(key, value);
        }
      });

      void navigate({ pathname, search: searchParams.toString() });
    },
    [getParams, navigate, pathname],
  );

  const removeParams = useCallback(
    (keys: string | string[]): void => {
      setParams((prevParams) => {
        const keysToRemove = new Set(Array.isArray(keys) ? keys : [keys]);

        return Object.fromEntries(
          Object.entries(prevParams).filter(([key]) => !keysToRemove.has(key)),
        );
      });
    },
    [setParams],
  );

  const clearParams = useCallback((): void => {
    void navigate({ pathname, search: '' });
  }, [navigate, pathname]);

  return {
    queryParams: getParams(),
    setParams,
    removeParams,
    clearParams,
  };
};
