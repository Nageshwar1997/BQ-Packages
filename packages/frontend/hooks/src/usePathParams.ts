import { useMemo } from 'react';
import { type NavigateFunction, useLocation, useNavigate, useParams } from 'react-router-dom';

/**
 * Current route info in one place: the route's dynamic `pathParams`, the `location` (also spread
 * flat: `pathname`, `search`, `hash`, `state`, `key`), `paths` (the pathname split into its
 * non-empty segments) and `navigate`.
 *
 * The returned object keeps its identity until the location changes, and `pathParams` and `paths`
 * only change when their content does, so they are safe in dependency arrays.
 *
 * Needs to be rendered inside a React Router (`react-router-dom`) router.
 */
export const usePathParams = () => {
  const navigate: NavigateFunction = useNavigate();
  const routerParams = useParams();
  const location = useLocation();
  const { pathname } = location;

  // React Router builds a brand-new `params` object whenever its <Routes> re-renders. Keying on the
  // content gives callers an object that only changes when a param value does.
  const paramsKey = JSON.stringify(routerParams);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- keyed by content on purpose
  const pathParams = useMemo(() => routerParams, [paramsKey]);

  // Only the pathname decides the segments, so a query-string or hash change keeps the same array.
  const paths = useMemo(() => pathname.split('/').filter((path) => path !== ''), [pathname]);

  return useMemo(
    () => ({ pathParams, location, ...location, paths, navigate }),
    [pathParams, location, paths, navigate],
  );
};
