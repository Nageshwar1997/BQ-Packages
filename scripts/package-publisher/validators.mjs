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
/*                              REQUIRED FILES                                */
/* -------------------------------------------------------------------------- */

/**
 * Validates the required package files.
 *
 * @param {string} packageDirectory
 * @returns {Promise<void>}
 */
async function validateRequiredFiles(packageDirectory) {
  const requiredFiles = [getPackageJsonPath(packageDirectory), getReadmePath(packageDirectory)];

  for (const file of requiredFiles) {
    if (await pathExists(file)) continue;

    throw new Error(`Required file not found: ${file}`);
  }
}

/* -------------------------------------------------------------------------- */
/*                                  VERSION                                   */
/* -------------------------------------------------------------------------- */

/**
 * Validates the package version.
 *
 * @param {PackageMetadata} metadata
 * @returns {void}
 */
function validateVersion(metadata) {
  if (!semver.valid(metadata.localVersion)) {
    throw new Error(
      `Invalid local version "${metadata.localVersion}" for "${metadata.npmPackageName}".`,
    );
  }

  if (!metadata.published) {
    return;
  }

  if (!semver.valid(metadata.remoteVersion)) {
    throw new Error(
      `Invalid remote version "${metadata.remoteVersion}" for "${metadata.npmPackageName}".`,
    );
  }

  if (!semver.gt(metadata.localVersion, metadata.remoteVersion)) {
    throw new Error(
      `"${metadata.npmPackageName}" version must be greater than the published version.`,
    );
  }
}

/* -------------------------------------------------------------------------- */
/*                              PUBLISH CONFIG                                */
/* -------------------------------------------------------------------------- */

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
 * Validates the required files of a workspace package.
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
  validateVersion(metadata);
  validatePublishConfig(metadata);
}
