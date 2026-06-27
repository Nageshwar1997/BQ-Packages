import semver from 'semver';

import { VERSION_TYPES } from './constants.mjs';
import { getPackageJsonPath } from './paths.mjs';
import { readJson, writeJson } from './utils.mjs';

/**
 * @import { PackageJson, VersionType } from './types.mjs'
 */

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

    case VERSION_TYPES.CURRENT_VERSION:
      return currentVersion;

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

  /** @type {PackageJson} */
  const packageJson = await readJson(packageJsonPath);

  packageJson.version = version;

  await writeJson(packageJsonPath, packageJson);
}
