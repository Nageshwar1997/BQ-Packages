/**
 * Builds a predicate that tests whether a request URL should be excluded
 * from automatic HTTP logging.
 *
 * A path matches when the URL is exactly the ignored path, or the ignored
 * path followed by `/` (a sub-path) or `?` (a query string). This is
 * deliberately stricter than a plain `url.startsWith(path)` check, which
 * would incorrectly treat `/health-check-2` as matching the ignored path
 * `/health`.
 *
 * @param ignorePaths - Path prefixes to ignore (e.g. `/health`).
 * @returns A predicate suitable for `pino-http`'s `autoLogging.ignore` hook.
 */
export function createPathIgnorer(ignorePaths: Iterable<string>) {
  const paths = [...ignorePaths];

  return (url: string | undefined): boolean => {
    if (!url) {
      return false;
    }

    return paths.some(
      (path) => url === path || url.startsWith(`${path}/`) || url.startsWith(`${path}?`),
    );
  };
}
