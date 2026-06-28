import { ensureLoggedIn } from './auth.mjs';
import { runBatchOperation } from './batch-operation.mjs';
import { sortPackagesByDependencies } from './dependency-sort.mjs';
import { publish as publishToNpm } from './npm.mjs';
import { confirmPublish, confirmPublishMany } from './prompts.mjs';
import { reportSuccess } from './reporter.mjs';
import { validatePublish } from './validators.mjs';

/**
 * @import { PackageMetadata } from './types.mjs'
 */

/* -------------------------------------------------------------------------- */
/*                             PRIVATE HELPERS                                */
/* -------------------------------------------------------------------------- */

/**
 * Publishes a package.
 *
 * @param {PackageMetadata} metadata
 * @param {string} username
 * @returns {Promise<void>}
 */
async function publishPackageInternal(metadata, username) {
  if (metadata.published) {
    throw new Error(`"${metadata.npmPackageName}" is already published.`);
  }

  validatePublish(metadata);

  await publishToNpm(metadata.directory);

  reportSuccess(
    `Published "${metadata.workspaceName}" (${metadata.npmPackageName}@${metadata.localVersion}) as "${username}".`,
  );
}

/* -------------------------------------------------------------------------- */
/*                               PUBLIC API                                   */
/* -------------------------------------------------------------------------- */

/**
 * Publishes a new package.
 *
 * @param {PackageMetadata} metadata
 * @returns {Promise<void>}
 */
export async function publishNewPackage(metadata) {
  const username = await ensureLoggedIn();

  const confirmed = await confirmPublish(metadata);

  if (!confirmed) {
    return;
  }

  await publishPackageInternal(metadata, username);
}

/**
 * Publishes multiple packages.
 *
 * @param {PackageMetadata[]} packages
 * @returns {Promise<void>}
 */
export async function publishPackages(packages) {
  const username = await ensureLoggedIn();

  const sortedPackages = sortPackagesByDependencies(packages);

  const confirmed = await confirmPublishMany(sortedPackages);

  if (!confirmed) {
    return;
  }

  await runBatchOperation({
    title: 'Publish Summary',
    items: sortedPackages,
    operation: (metadata) => publishPackageInternal(metadata, username),
    getItemName: (metadata) => `${metadata.workspaceName} (${metadata.npmPackageName})`,
  });
}

/**
 * Publishes all packages.
 *
 * @param {PackageMetadata[]} packages
 * @returns {Promise<void>}
 */
export async function publishAllPackages(packages) {
  await publishPackages(packages);
}
