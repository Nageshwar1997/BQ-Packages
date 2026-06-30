import { ensureLoggedIn } from '../common/auth.mjs';
import { publishToNpm } from '../common/npm.mjs';
import { runBatchOperation } from './batch-operation.mjs';
import { sortPackagesByDependencies } from './dependency-sort.mjs';
import { confirmPublish, confirmPublishMany } from './prompts.mjs';
import { reportSuccess } from './reporter.mjs';
import { validatePublish } from './validators.mjs';
/**
 * @import { PublishPackageMetadata } from '../common/types.mjs'
 */

/* -------------------------------------------------------------------------- */
/*                             PRIVATE HELPERS                                */
/* -------------------------------------------------------------------------- */

/**
 * Publishes a package.
 *
 * @param {PublishPackageMetadata} metadata
 * @param {string} username
 * @returns {Promise<void>}
 */
async function publishPackageInternal(metadata, username) {
  validatePublish(metadata);

  await publishToNpm(metadata.directory, metadata.localVersion);

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
 * @param {PublishPackageMetadata} metadata
 * @returns {Promise<void>}
 */
export async function publishNewPackage(metadata) {
  const username = await ensureLoggedIn();

  const isConfirmed = await confirmPublish(metadata);

  if (!isConfirmed) {
    return;
  }

  await publishPackageInternal(metadata, username);
}

/**
 * Publishes multiple packages.
 *
 * @param {PublishPackageMetadata[]} packages
 * @returns {Promise<void>}
 */
export async function publishPackages(packages) {
  if (packages.length === 0) {
    return;
  }

  const username = await ensureLoggedIn();

  const packagesToPublish = sortPackagesByDependencies(packages);

  const isConfirmed = await confirmPublishMany(packagesToPublish);

  if (!isConfirmed) {
    return;
  }

  await runBatchOperation({
    title: 'Publish Summary',
    items: packagesToPublish,
    operation: (metadata) => publishPackageInternal(metadata, username),
    getItemName: (metadata) => `${metadata.workspaceName} (${metadata.npmPackageName})`,
  });
}

/**
 * Publishes all packages.
 *
 * @param {PublishPackageMetadata[]} packages
 * @returns {Promise<void>}
 */
export async function publishAllPackages(packages) {
  await publishPackages(packages);
}
