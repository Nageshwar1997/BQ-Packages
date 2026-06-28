import { ensureLoggedIn } from './auth.mjs';
import { sortPackagesByDependencies } from './dependency-sort.mjs';
import { publish as publishToNpm } from './npm.mjs';
import { confirmPublish, confirmPublishMany } from './prompts.mjs';
import { reportError, reportSuccess, reportSummary } from './reporter.mjs';
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
async function publishWorkspacePackage(metadata, username) {
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

  await publishWorkspacePackage(metadata, username);
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

  let successful = 0;
  let failed = 0;

  for (const metadata of sortedPackages) {
    try {
      await publishWorkspacePackage(metadata, username);
      successful++;
    } catch (error) {
      failed++;

      reportError(`Failed to publish "${metadata.workspaceName}" (${metadata.npmPackageName}).`);

      reportError(error instanceof Error ? error.message : String(error));
    }
  }

  reportSummary({ title: 'Publish Summary', successful, failed });
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
