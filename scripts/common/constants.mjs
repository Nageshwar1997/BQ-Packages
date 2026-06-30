/**
 * Package scope used for all generated packages.
 */
export const PACKAGE_SCOPE = '@beautinique';

/**
 * Build artifacts to be included when publishing the package.
 */
export const BUILD_ARTIFACTS = new Set(['dist', '.tsbuildinfo']);

/**
 * Exit codes.
 */
export const EXIT_CODES = Object.freeze({ SUCCESS: 0, FAILURE: 1 });

export const COMMON_ACTIONS = Object.freeze({
  PACKAGE_STATUS: 'package-status',
  LOGIN: 'login',
  LOGOUT: 'logout',
  EXIT: 'exit',
});
