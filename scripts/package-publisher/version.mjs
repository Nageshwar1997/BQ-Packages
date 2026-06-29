import semver from 'semver';

import { VERSION_TYPES } from './constants.mjs';
import { JsonError, VersionError } from './errors.mjs';
import { getPackageJsonPath } from './paths.mjs';
import { parseData, readFileByPath, writeJson } from './utils.mjs';

/**
 * @import { PackageJson, VersionType } from './types.mjs'
 */

/* -------------------------------------------------------------------------- */
/*                             PRIVATE HELPERS                                */
/* -------------------------------------------------------------------------- */

/**
 * Ensures the next version is greater than the current version.
 *
 * @param {string} currentVersion
 * @param {string} nextVersion
 * @returns {void}
 */
function validateVersionIncrease(currentVersion, nextVersion) {
  if (!semver.gt(nextVersion, currentVersion)) {
    throw new VersionError(`Version "${nextVersion}" must be greater than "${currentVersion}".`);
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
    throw new VersionError(`Failed to increment "${version}" using "${release}" release type.`);
  }

  return nextVersion;
}

/**
 * Returns the indentation used by a JSON document.
 *
 * @param {string} content
 * @returns {string | number}
 */
function detectJsonIndent(content) {
  const match = content.match(/\n([ \t]+)"/);

  return match?.[1] ?? 2;
}

/**
 * Reads and parses package JSON while keeping the raw content.
 *
 * @param {string} packageJsonPath
 * @returns {Promise<{ content: string; packageJson: PackageJson }>}
 */
async function readPackageJsonWithContent(packageJsonPath) {
  const content = await readFileByPath(packageJsonPath);

  try {
    return {
      content,
      packageJson: parseData(content),
    };
  } catch {
    throw new JsonError(`Failed to parse JSON: ${packageJsonPath}`);
  }
}

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

/**
 * Calculates the next package version.
 *
 * @param {string} currentVersion
 * @param {VersionType} versionType
 * @param {string} [customVersion]
 * @param {string} packageName
 * @returns {string}
 */
export function calculateVersion(currentVersion, versionType, customVersion, packageName) {
  validateVersion(currentVersion, 'version', packageName);

  switch (versionType) {
    case VERSION_TYPES.PATCH:
      return incrementVersion(currentVersion, 'patch');

    case VERSION_TYPES.MINOR:
      return incrementVersion(currentVersion, 'minor');

    case VERSION_TYPES.MAJOR:
      return incrementVersion(currentVersion, 'major');

    case VERSION_TYPES.CUSTOM: {
      if (!customVersion) {
        throw new VersionError('Custom version is required.');
      }

      validateVersion(customVersion, 'custom version', packageName);
      validateVersionIncrease(currentVersion, customVersion);

      return customVersion;
    }

    default:
      throw new VersionError(`Unsupported version type "${versionType}".`);
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
 * @param {string} packageName
 * @returns {Promise<void>}
 */
export async function updatePackageVersion(packageDirectory, version, packageName) {
  validateVersion(version, 'version', packageName);

  const packageJsonPath = getPackageJsonPath(packageDirectory);

  const { content, packageJson } = await readPackageJsonWithContent(packageJsonPath);

  packageJson.version = version;

  await writeJson(packageJsonPath, packageJson, {
    indent: detectJsonIndent(content),
    trailingNewline: content.endsWith('\n'),
  });
}
