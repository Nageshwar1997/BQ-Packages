import { ensureLoggedIn } from './auth.mjs';
import { runBatchOperation } from './batch-operation.mjs';
import { VERSION_TYPES } from './constants.mjs';
import { sortPackagesByDependencies } from './dependency-sort.mjs';
import { republish as republishToNpm } from './npm.mjs';
import {
  confirmRepublish,
  confirmRepublishMany,
  enterCustomVersion,
  selectVersion,
} from './prompts.mjs';
import { reportSuccess, reportWarning } from './reporter.mjs';
import { validateRepublish } from './validators.mjs';
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
 * Republishes an updated package version.
 *
 * @param {PackageMetadata} metadata
 * @param {string} version
 * @param {string} username
 * @returns {Promise<void>}
 */
async function republishPackageInternal(metadata, version, username) {
  validateRepublish({ ...metadata, localVersion: version });

  await updatePackageVersion(metadata.directory, version);

  try {
    await republishToNpm(metadata.directory, version);

    reportSuccess(
      `Republished "${metadata.workspaceName}" (${metadata.npmPackageName}) ${metadata.localVersion} → ${version} as "${username}".`,
    );
  } catch (error) {
    try {
      await restoreVersion(metadata);
    } catch (restoreError) {
      reportWarning(
        `Failed to restore version for "${metadata.npmPackageName}": ${
          restoreError instanceof Error ? restoreError.message : String(restoreError)
        }`,
      );
    }

    throw error;
  }
}

/**
 * Returns the next package version.
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

/**
 * Builds republish items.
 *
 * @param {PackageMetadata[]} packages
 * @returns {Promise<
 *   {
 *     metadata: PackageMetadata;
 *     version: string;
 *   }[]
 * >}
 */
async function buildRepublishItems(packages) {
  /** @type {{ metadata: PackageMetadata; version: string }[]} */
  const items = [];

  for (const metadata of packages) {
    items.push({
      metadata,
      version: await getNextVersion(metadata),
    });
  }

  return items;
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

  const isConfirmed = await confirmRepublish(metadata, nextVersion);

  if (!isConfirmed) {
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
  if (packages.length === 0) {
    return;
  }

  const username = await ensureLoggedIn();

  const packagesToRepublish = sortPackagesByDependencies(packages);

  const items = await buildRepublishItems(packagesToRepublish);

  const isConfirmed = await confirmRepublishMany(items);

  if (!isConfirmed) {
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
