import path from 'node:path';

/* -------------------------------------------------------------------------- */
/*                                 DIRECTORIES                                */
/* -------------------------------------------------------------------------- */

export const ROOT_DIRECTORY = process.cwd();

export const PACKAGES_DIRECTORY = path.join(ROOT_DIRECTORY, 'packages');

/* -------------------------------------------------------------------------- */
/*                                   FILES                                    */
/* -------------------------------------------------------------------------- */

/**
 * Returns the package.json path.
 *
 * @param {string} packageDirectory
 * @returns {string}
 */
export function getPackageJsonPath(packageDirectory) {
  return path.join(packageDirectory, 'package.json');
}

/**
 * Returns the README.md path.
 *
 * @param {string} packageDirectory
 * @returns {string}
 */
export function getReadmePath(packageDirectory) {
  return path.join(packageDirectory, 'README.md');
}
