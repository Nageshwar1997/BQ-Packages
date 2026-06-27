import { getPackageMetadata } from './metadata.mjs';
import { publish as publishToNpm } from './npm.mjs';
import { validatePackage, validatePublish } from './validators.mjs';

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

  await validatePublish(metadata);

  await publishToNpm(metadata.directory);
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
  await publishPackages(packages);
}
