import { VERSION_TYPES } from './constants.mjs';
import { getPackageMetadata } from './metadata.mjs';
import { publish as publishToNpm } from './npm.mjs';
import { confirmPublish, enterCustomVersion, selectVersion } from './prompts.mjs';
import { validatePackage, validatePublish } from './validators.mjs';
import { calculateVersion, updatePackageVersion } from './version.mjs';

/**
 * @import { WorkspacePackage } from './types.mjs'
 */

/* -------------------------------------------------------------------------- */
/*                             PRIVATE HELPERS                                */
/* -------------------------------------------------------------------------- */

/**
 * Publishes a workspace package.
 *
 * @param {WorkspacePackage} pkg
 * @returns {Promise<void>}
 */
async function publishWorkspacePackage(pkg) {
  await validatePackage(pkg);

  const metadata = await getPackageMetadata(pkg);

  const versionType = await selectVersion(metadata.localVersion);

  const customVersion =
    versionType === VERSION_TYPES.CUSTOM
      ? await enterCustomVersion(metadata.localVersion)
      : undefined;

  const version = calculateVersion(metadata.localVersion, versionType, customVersion);

  const confirmed = await confirmPublish(metadata, version);

  if (!confirmed) {
    return;
  }

  await updatePackageVersion(metadata.directory, version);

  const updatedMetadata = await getPackageMetadata(pkg);

  await validatePublish(updatedMetadata);

  await publishToNpm(updatedMetadata.directory);
}

/* -------------------------------------------------------------------------- */
/*                               PUBLIC API                                   */
/* -------------------------------------------------------------------------- */

/**
 * Publishes a workspace package.
 *
 * @param {WorkspacePackage} pkg
 * @returns {Promise<void>}
 */
export async function publishPackage(pkg) {
  await publishWorkspacePackage(pkg);
}

/**
 * Publishes multiple workspace packages.
 *
 * @param {WorkspacePackage[]} packages
 * @returns {Promise<void>}
 */
export async function publishPackages(packages) {
  for (const pkg of packages) {
    await publishWorkspacePackage(pkg);
  }
}

/**
 * Publishes all workspace packages.
 *
 * @param {WorkspacePackage[]} packages
 * @returns {Promise<void>}
 */
export async function publishAllPackages(packages) {
  for (const pkg of packages) {
    await publishWorkspacePackage(pkg);
  }
}
