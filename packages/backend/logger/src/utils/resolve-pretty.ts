/**
 * Resolves the effective "pretty" (development) mode for a logger.
 *
 * Centralizes the environment-driven default so that development-vs-production
 * behaviour is decided in exactly one place, per the package's configuration
 * philosophy: callers pass an explicit `pretty` flag when they want to
 * override it, and everyone else gets a sensible default based on the
 * `IS_DEV` environment variable.
 *
 * @param pretty - Explicit override, if the consumer supplied one.
 * @returns `true` when pretty/development output should be used.
 */
export function resolvePretty(pretty?: boolean): boolean {
  if (typeof pretty === 'boolean') {
    return pretty;
  }

  return process.env.IS_DEV === 'true';
}
