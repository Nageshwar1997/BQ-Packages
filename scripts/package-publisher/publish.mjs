import { ensureLoggedIn } from './auth.mjs';
import { publish as publishToNpm } from './npm.mjs';
import { confirmPublish, confirmPublishMany } from './prompts.mjs';
import { validatePublish } from './validators.mjs';

/**
 * @import { PackageMetadata } from './types.mjs'
 */

/* -------------------------------------------------------------------------- */
/*                             PRIVATE HELPERS                                */
/* -------------------------------------------------------------------------- */

/**
 * Publishes a new package.
 *
 * @param {PackageMetadata} metadata
 * @param {string} username
 * @returns {Promise<void>}
 */
async function publishWorkspacePackage(metadata, username) {
  if (metadata.published) {
    throw new Error(`"${metadata.npmPackageName}" is already published.`);
  }

  const confirmed = await confirmPublish(metadata);

  if (!confirmed) {
    return;
  }

  validatePublish(metadata);

  await publishToNpm(metadata.directory);

  console.log(
    `✔ Successfully published "${metadata.workspaceName}" (${metadata.npmPackageName}@${metadata.localVersion}) as "${username}".`,
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

  const confirmed = await confirmPublishMany(packages);

  if (!confirmed) {
    return;
  }

  let success = 0;
  let failed = 0;

  for (const metadata of packages) {
    try {
      await publishWorkspacePackage(metadata, username);
      success++;
    } catch (error) {
      failed++;

      console.error(
        `✖ Failed to publish "${metadata.workspaceName}" (${metadata.npmPackageName}).`,
      );

      console.error(error instanceof Error ? error.message : error);
    }
  }

  console.log('');

  console.log('Publish Summary');

  console.log(`✔ Successful : ${success}`);
  console.log(`✖ Failed     : ${failed}`);
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
