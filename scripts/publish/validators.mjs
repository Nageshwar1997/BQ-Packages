import semver from 'semver';
import { PublishError, ValidationError } from '../common/errors.mjs';
import { getPackageJsonPath, getReadmePath } from '../common/paths.mjs';
import { pathExists } from '../common/utils.mjs';
import { validateVersion } from './version.mjs';

/**
 * @import { PublishPackageMetadata, WorkspacePackage } from '../common/types.mjs'
 */

/* -------------------------------------------------------------------------- */
/*                              PRIVATE HELPERS                               */
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
    if (await pathExists(file)) {
      continue;
    }

    throw new ValidationError(`Required file not found: ${file}`);
  }
}

/**
 * Validates the package version before publishing.
 *
 * @param {PublishPackageMetadata} metadata
 * @returns {void}
 */
function validatePublishVersion(metadata) {
  validateVersion(metadata.localVersion, 'local version', metadata.npmPackageName);

  if (!metadata.published) {
    return;
  }

  validateVersion(metadata.remoteVersion, 'remote version', metadata.npmPackageName);

  if (!semver.gt(metadata.localVersion, metadata.remoteVersion)) {
    throw new PublishError(
      `"${metadata.npmPackageName}" version must be greater than the published version.`,
    );
  }
}

/**
 * Validates whether a package has already been published.
 *
 * @param {PublishPackageMetadata} metadata
 * @returns {void}
 */
function validatePublished(metadata) {
  if (!metadata.published) {
    throw new PublishError(`"${metadata.npmPackageName}" has not been published yet.`);
  }
}

/**
 * Validates the publish configuration.
 *
 * @param {PublishPackageMetadata} metadata
 * @returns {void}
 */
function validatePublishConfig(metadata) {
  if (!metadata.publishConfig) {
    throw new ValidationError(`"${metadata.npmPackageName}" is missing "publishConfig".`);
  }

  if (metadata.publishConfig.access !== 'public') {
    throw new ValidationError(
      `"${metadata.npmPackageName}" must use "publishConfig.access": "public".`,
    );
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
 * @param {PublishPackageMetadata} metadata
 * @returns {void}
 */
export function validatePublish(metadata) {
  validatePublishVersion(metadata);
  validatePublishConfig(metadata);
}

/**
 * Validates whether a package can be republished.
 *
 * @param {PublishPackageMetadata} metadata
 * @returns {void}
 */
export function validateRepublish(metadata) {
  validatePublished(metadata);
  validatePublishVersion(metadata);
  validatePublishConfig(metadata);
}
