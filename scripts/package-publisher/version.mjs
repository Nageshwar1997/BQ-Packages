import semver from 'semver';
import { VERSION_TYPES } from './constants.mjs';
import { getPackageJsonPath } from './paths.mjs';
import { readJson, writeJson } from './utils.mjs';

/**
 * @import { PackageJson, VersionType } from './types.mjs'
 */

/* -------------------------------------------------------------------------- */
/*                             PRIVATE HELPERS                                */
/* -------------------------------------------------------------------------- */

/**
 * Reads a package.json file.
 *
 * @param {string} packageDirectory
 * @returns {Promise<PackageJson>}
 */
async function readPackageJson(packageDirectory) {
  return readJson(getPackageJsonPath(packageDirectory));
}

/**
 * Validates a semantic version.
 *
 * @param {unknown} version
 * @param {string} label
 * @returns {void}
 */
function validateVersion(version, label) {
  if (typeof version !== 'string' || !semver.valid(version)) {
    throw new Error(`Invalid ${label} "${version}".`);
  }
}

/**
 * Ensures the next version is greater than the current version.
 *
 * @param {string} currentVersion
 * @param {string} nextVersion
 * @returns {void}
 */
function validateVersionIncrease(currentVersion, nextVersion) {
  if (!semver.gt(nextVersion, currentVersion)) {
    throw new Error(`Version "${nextVersion}" must be greater than "${currentVersion}".`);
  }
}

/**
 * Returns the incremented version.
 *
 * @param {string} version
 * @param {Exclude<VersionType, "custom">} release
 * @returns {string}
 */
function incrementVersion(version, release) {
  const nextVersion = semver.inc(version, release);

  if (!nextVersion) {
    throw new Error(`Failed to increment version "${version}".`);
  }

  return nextVersion;
}

/* -------------------------------------------------------------------------- */
/*                              VERSION HELPERS                               */
/* -------------------------------------------------------------------------- */

/**
 * Calculates the next package version.
 *
 * @param {string} currentVersion
 * @param {VersionType} versionType
 * @param {string} [customVersion]
 * @returns {string}
 */
export function calculateVersion(currentVersion, versionType, customVersion) {
  validateVersion(currentVersion, 'version');

  switch (versionType) {
    case VERSION_TYPES.PATCH:
      return incrementVersion(currentVersion, 'patch');

    case VERSION_TYPES.MINOR:
      return incrementVersion(currentVersion, 'minor');

    case VERSION_TYPES.MAJOR:
      return incrementVersion(currentVersion, 'major');

    case VERSION_TYPES.CUSTOM: {
      if (!customVersion) {
        throw new Error('Custom version is required.');
      }

      validateVersion(customVersion, 'custom version');
      validateVersionIncrease(currentVersion, customVersion);

      return customVersion;
    }

    default:
      throw new Error(`Unsupported version type "${versionType}".`);
  }
}

/* -------------------------------------------------------------------------- */
/*                              PACKAGE VERSION                               */
/* -------------------------------------------------------------------------- */

/**
 * Returns the current package version.
 *
 * @param {string} packageDirectory
 * @returns {Promise<string>}
 */
export async function getPackageVersion(packageDirectory) {
  const { version } = await readPackageJson(packageDirectory);

  validateVersion(version, 'package version');

  return version;
}

/**
 * Updates the package version.
 *
 * @param {string} packageDirectory
 * @param {string} version
 * @returns {Promise<void>}
 */
export async function updatePackageVersion(packageDirectory, version) {
  validateVersion(version, 'version');

  const packageJsonPath = getPackageJsonPath(packageDirectory);

  const packageJson = await readPackageJson(packageDirectory);

  packageJson.version = version;

  await writeJson(packageJsonPath, packageJson);
}
