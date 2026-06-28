import { ensureLoggedIn } from './auth.mjs';
import { runBatchOperation } from './batch-operation.mjs';
import { VERSION_TYPES } from './constants.mjs';
import { sortPackagesByDependencies } from './dependency-sort.mjs';
import { publish as publishToNpm } from './npm.mjs';
import {
  confirmRepublish,
  confirmRepublishMany,
  enterCustomVersion,
  selectVersion,
} from './prompts.mjs';
import { reportSuccess } from './reporter.mjs';
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
 * @param {string} version
 * @param {string} username
 * @returns {Promise<void>}
 */
async function republishPackageInternal(metadata, version, username) {
  if (!metadata.published) {
    throw new Error(`"${metadata.npmPackageName}" has not been published yet.`);
  }

  await updatePackageVersion(metadata.directory, version);

  try {
    validatePublish({
      ...metadata,
      localVersion: version,
    });

    await publishToNpm(metadata.directory);

    reportSuccess(
      `Republished "${metadata.workspaceName}" (${metadata.npmPackageName}) ${metadata.localVersion} → ${version} as "${username}".`,
    );
  } catch (error) {
    await restoreVersion(metadata);
    throw error;
  }
}

/**
 * Calculates the next package version.
 *
 * @param {PackageMetadata} metadata
 * @returns {Promise<string>}
 */
async function getNextVersion(metadata) {
  const versionType = await selectVersion(metadata.localVersion);

  const customVersion =
    versionType === VERSION_TYPES.CUSTOM
      ? await enterCustomVersion(metadata.localVersion)
      : undefined;

  return calculateVersion(metadata.localVersion, versionType, customVersion);
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

  const nextVersion = await getNextVersion(metadata);

  const confirmed = await confirmRepublish(metadata, nextVersion);

  if (!confirmed) {
    return;
  }

  await republishPackageInternal(metadata, nextVersion, username);
}

/**
 * Republishes multiple packages.
 *
 * @param {PackageMetadata[]} packages
 * @returns {Promise<void>}
 */
export async function republishPackages(packages) {
  const username = await ensureLoggedIn();

  const sortedPackages = sortPackagesByDependencies(packages);

  const items = [];

  for (const metadata of sortedPackages) {
    items.push({
      metadata,
      version: await getNextVersion(metadata),
    });
  }

  const confirmed = await confirmRepublishMany(items);

  if (!confirmed) {
    return;
  }

  await runBatchOperation({
    title: 'Republish Summary',
    items,
    operation: ({ metadata, version }) => republishPackageInternal(metadata, version, username),
    getItemName: ({ metadata }) => `${metadata.workspaceName} (${metadata.npmPackageName})`,
  });
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
