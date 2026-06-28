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
  if (!semver.valid(currentVersion)) {
    throw new Error(`Invalid version "${currentVersion}".`);
  }

  switch (versionType) {
    case VERSION_TYPES.PATCH:
      return semver.inc(currentVersion, 'patch');

    case VERSION_TYPES.MINOR:
      return semver.inc(currentVersion, 'minor');

    case VERSION_TYPES.MAJOR:
      return semver.inc(currentVersion, 'major');

    case VERSION_TYPES.CUSTOM: {
      if (!customVersion) {
        throw new Error('Custom version is required.');
      }

      if (!semver.valid(customVersion)) {
        throw new Error(`Invalid custom version "${customVersion}".`);
      }

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
  const packageJson = await readPackageJson(packageDirectory);

  return packageJson.version;
}

/**
 * Updates the package version.
 *
 * @param {string} packageDirectory
 * @param {string} version
 * @returns {Promise<void>}
 */
export async function updatePackageVersion(packageDirectory, version) {
  if (!semver.valid(version)) {
    throw new Error(`Invalid version "${version}".`);
  }

  const packageJsonPath = getPackageJsonPath(packageDirectory);

  const packageJson = await readPackageJson(packageDirectory);

  packageJson.version = version;

  await writeJson(packageJsonPath, packageJson);
}
