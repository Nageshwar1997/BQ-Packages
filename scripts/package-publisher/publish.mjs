import { ensureLoggedIn } from './auth.mjs';
import { getPackageMetadata } from './metadata.mjs';
import { publish as publishToNpm } from './npm.mjs';
import { confirmPublish } from './prompts.mjs';
import { validatePackage, validatePublish } from './validators.mjs';

/**
 * @import { WorkspacePackage } from './types.mjs'
 */

/* -------------------------------------------------------------------------- */
/*                             PRIVATE HELPERS                                */
/* -------------------------------------------------------------------------- */

/**
 * Publishes a new workspace package.
 *
 * @param {WorkspacePackage} pkg
 * @returns {Promise<void>}
 */
async function publishNewWorkspacePackage(pkg) {
  await validatePackage(pkg);

  const metadata = await getPackageMetadata(pkg);

  if (metadata.published) {
    throw new Error(`"${metadata.packageName}" is already published.`);
  }

  const confirmed = await confirmPublish(metadata);

  if (!confirmed) {
    return;
  }

  await validatePublish(metadata);

  await publishToNpm(metadata.directory);

  console.log(`✔ Successfully published "${metadata.packageName}@${metadata.localVersion}".`);
}

/* -------------------------------------------------------------------------- */
/*                               PUBLIC API                                   */
/* -------------------------------------------------------------------------- */

/**
 * Publishes a new workspace package.
 *
 * @param {WorkspacePackage} pkg
 * @returns {Promise<void>}
 */
export async function publishNewPackage(pkg) {
  await ensureLoggedIn();

  await publishNewWorkspacePackage(pkg);
}
