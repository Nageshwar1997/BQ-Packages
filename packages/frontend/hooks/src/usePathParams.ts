import { type NavigateFunction, useLocation, useNavigate, useParams } from 'react-router-dom';

/**
 * Current route info in one place: the route's dynamic `pathParams`, the `location` (also spread
 * flat: `pathname`, `search`, `hash`, `state`, `key`), `paths` (the pathname split into its
 * non-empty segments) and `navigate`.
 *
 * Needs to be rendered inside a React Router (`react-router-dom`) router.
 */
export const usePathParams = () => {
  const navigate: NavigateFunction = useNavigate();
  const pathParams = useParams();
  const location = useLocation();
  const paths = location.pathname.split('/').filter((path) => path !== '');

  return { pathParams, location, ...location, paths, navigate };
};
