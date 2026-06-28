import { ensureLoggedIn } from './auth.mjs';
import { publish as publishToNpm } from './npm.mjs';
import { confirmPublish } from './prompts.mjs';
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
 * @returns {Promise<void>}
 */
async function publishPackage(metadata) {
  if (metadata.published) {
    throw new Error(`"${metadata.npmPackageName}" is already published.`);
  }

  const confirmed = await confirmPublish(metadata);

  if (!confirmed) {
    return;
  }

  validatePublish(metadata);

  await publishToNpm(metadata.directory);
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

  await publishPackage(metadata);

  console.log(
    `✔ Successfully published "${metadata.workspaceName}" (${metadata.npmPackageName}@${metadata.localVersion}) as "${username}".`,
  );
}
