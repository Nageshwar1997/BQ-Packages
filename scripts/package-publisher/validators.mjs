import semver from 'semver';
import { getPackageJsonPath, getReadmePath } from './paths.mjs';
import { pathExists } from './utils.mjs';

/**
 * @import {
 *   PackageMetadata,
 *   WorkspacePackage,
 * } from './types.mjs'
 */

/* -------------------------------------------------------------------------- */
/*                              PRIVATE HELPERS                               */
/* -------------------------------------------------------------------------- */

/**
 * Validates a semantic version.
 *
 * @param {string | null} version
 * @param {string} label
 * @returns {void}
 */
function validateVersion(version, label) {
  if (!version || !semver.valid(version)) {
    throw new Error(`Invalid ${label} "${version}".`);
  }
}

/**
 * Validates the required package files.
 *
 * @param {string} packageDirectory
 * @returns {Promise<void>}
 */
async function validateRequiredFiles(packageDirectory) {
  const requiredFiles = [getPackageJsonPath(packageDirectory), getReadmePath(packageDirectory)];

  for (const file of requiredFiles) {
    if (await pathExists(file)) {
      continue;
    }

    throw new Error(`Required file not found: ${file}`);
  }
}

/**
 * Validates the package version before publishing.
 *
 * @param {PackageMetadata} metadata
 * @returns {void}
 */
function validatePublishVersion(metadata) {
  validateVersion(metadata.localVersion, 'local version');

  if (!metadata.published) {
    return;
  }

  validateVersion(metadata.remoteVersion, 'remote version');

  if (!semver.gt(metadata.localVersion, metadata.remoteVersion)) {
    throw new Error(
      `"${metadata.npmPackageName}" version must be greater than the published version.`,
    );
  }
}

/**
 * Validates the publish configuration.
 *
 * @param {PackageMetadata} metadata
 * @returns {void}
 */
function validatePublishConfig(metadata) {
  if (!metadata.publishConfig) {
    throw new Error(`"${metadata.npmPackageName}" is missing "publishConfig".`);
  }

  if (metadata.publishConfig.access !== 'public') {
    throw new Error(`"${metadata.npmPackageName}" must use "publishConfig.access": "public".`);
  }
}

/* -------------------------------------------------------------------------- */
/*                               PUBLIC API                                   */
/* -------------------------------------------------------------------------- */

/**
 * Validates a workspace package.
 *
 * @param {WorkspacePackage} pkg
 * @returns {Promise<void>}
 */
export async function validatePackage(pkg) {
  await validateRequiredFiles(pkg.directory);
}

/**
 * Validates whether a package can be published.
 *
 * @param {PackageMetadata} metadata
 * @returns {void}
 */
export function validatePublish(metadata) {
  validatePublishVersion(metadata);
  validatePublishConfig(metadata);
}

/**
 * Validates whether a package can be republished.
 *
 * @param {PackageMetadata} metadata
 * @returns {void}
 */
export function validateRepublish(metadata) {
  if (!metadata.published) {
    throw new Error(`"${metadata.npmPackageName}" has not been published yet.`);
  }

  validatePublishConfig(metadata);
}
