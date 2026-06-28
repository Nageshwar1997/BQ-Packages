import { ensureLoggedIn } from './auth.mjs';
import { VERSION_TYPES } from './constants.mjs';
import { publish as publishToNpm } from './npm.mjs';
import { confirmRepublish, enterCustomVersion, selectVersion } from './prompts.mjs';
import { validatePublish } from './validators.mjs';
import { calculateVersion, updatePackageVersion } from './version.mjs';

/**
 * @import { PackageMetadata } from './types.mjs'
 */

/* -------------------------------------------------------------------------- */
/*                             PRIVATE HELPERS                                */
/* -------------------------------------------------------------------------- */

/**
 * Restores the previous package version.
 *
 * @param {PackageMetadata} metadata
 * @returns {Promise<void>}
 */
async function restoreVersion(metadata) {
  await updatePackageVersion(metadata.directory, metadata.localVersion);
}

/**
 * Republishes a package.
 *
 * @param {PackageMetadata} metadata
 * @param {string} username
 * @returns {Promise<void>}
 */
async function republishWorkspacePackage(metadata, username) {
  if (!metadata.published) {
    throw new Error(`"${metadata.npmPackageName}" has not been published yet.`);
  }

  const versionType = await selectVersion(metadata.localVersion);

  const customVersion =
    versionType === VERSION_TYPES.CUSTOM
      ? await enterCustomVersion(metadata.localVersion)
      : undefined;

  const nextVersion = calculateVersion(metadata.localVersion, versionType, customVersion);

  const confirmed = await confirmRepublish(metadata, nextVersion);

  if (!confirmed) {
    return;
  }

  await updatePackageVersion(metadata.directory, nextVersion);

  try {
    validatePublish({
      ...metadata,
      localVersion: nextVersion,
    });

    await publishToNpm(metadata.directory);

    console.log(
      `✔ Successfully republished "${metadata.workspaceName}" (${metadata.npmPackageName}) ${metadata.localVersion} → ${nextVersion} as "${username}".`,
    );
  } catch (error) {
    await restoreVersion(metadata);

    throw error;
  }
}

/* -------------------------------------------------------------------------- */
/*                               PUBLIC API                                   */
/* -------------------------------------------------------------------------- */

/**
 * Republishes a package.
 *
 * @param {PackageMetadata} metadata
 * @returns {Promise<void>}
 */
export async function republishPackage(metadata) {
  const username = await ensureLoggedIn();

  await republishWorkspacePackage(metadata, username);
}

/**
 * Republishes multiple packages.
 *
 * @param {PackageMetadata[]} packages
 * @returns {Promise<void>}
 */
export async function republishPackages(packages) {
  const username = await ensureLoggedIn();

  for (const metadata of packages) {
    await republishWorkspacePackage(metadata, username);
  }
}

/**
 * Republishes all packages.
 *
 * @param {PackageMetadata[]} packages
 * @returns {Promise<void>}
 */
export async function republishAllPackages(packages) {
  await republishPackages(packages);
}
