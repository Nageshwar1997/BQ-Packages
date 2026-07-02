import semver from 'semver';

/* -------------------------------------------------------------------------- */
/*                              VERSION HELPERS                               */
/* -------------------------------------------------------------------------- */

/**
 * Validates a semantic version value returned from a package source.
 *
 * @param {unknown} version
 * @param {string} label
 * @param {string} packageName
 * @returns {void}
 */
export function validateVersion(version, label, packageName) {
  if (typeof version !== 'string' || !semver.valid(version)) {
    throw new ValidationError(`Invalid ${label} "${version}" for "${packageName}".`);
  }
}
