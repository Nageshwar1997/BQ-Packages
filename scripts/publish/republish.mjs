import { ensureLoggedIn } from '../common/auth.mjs';
import { republishToNpm } from '../common/npm.mjs';
import { getPackageJsonPath } from '../common/paths.mjs';
import { reportSuccess, reportWarning } from '../common/reporter.mjs';
import { parseData, readFileByPath, writeJson } from '../common/utils.mjs';
import { runBatchOperation } from './batch-operation.mjs';
import { VERSION_TYPES } from './constants.mjs';
import { sortPackagesByDependencies } from './dependency-sort.mjs';
import { updateInternalDependencyVersions } from './dependency-version.mjs';
import {
  confirmRepublish,
  confirmRepublishMany,
  enterCustomVersion,
  selectVersion,
} from './prompts.mjs';
import {
  createReleasePlan,
  getReleasePlanEntries,
  getReleasePlanPackages,
} from './release-plan.mjs';
import { createSnapshot, restoreSnapshot } from './rollback.mjs';
import { validateRepublish } from './validators.mjs';
/**
 * @import { PublishPackageMetadata } from '../common/types.mjs'
 * @import { ReleasePlan, ReleasePlanEntry } from './release-plan.mjs'
 */

/* -------------------------------------------------------------------------- */
/*                             PRIVATE HELPERS                                */
/* -------------------------------------------------------------------------- */

/**
 * Returns the indentation used by a JSON document.
 *
 * @param {string} content
 * @returns {string | number}
 */
function detectJsonIndent(content) {
  const match = content.match(/\n([ \t]+)"/);

  return match?.[1] ?? 2;
}

/**
 * Republishes an updated package version.
 *
 * @param {PublishPackageMetadata} metadata
 * @param {string} version
 * @param {string} username
 * @returns {Promise<void>}
 */
async function republishPackageInternal(metadata, version, username) {
  validateRepublish({ ...metadata, localVersion: version });

  await republishToNpm(metadata.directory, version);

  reportSuccess(
    `Republished "${metadata.workspaceName}" (${metadata.npmPackageName}) ${metadata.localVersion} → ${version} as "${username}".`,
  );
}

/**
 * Returns the package release strategy.
 *
 * @param {PublishPackageMetadata} metadata
 * @returns {Promise<{ releaseType: import('./types.mjs').VersionType; customVersion?: string }>}
 */
async function getReleaseStrategy(metadata) {
  const versionType = await selectVersion(metadata.localVersion, metadata.npmPackageName);

  const customVersion =
    versionType === VERSION_TYPES.CUSTOM
      ? await enterCustomVersion(metadata.localVersion)
      : undefined;

  return {
    releaseType: versionType,
    customVersion,
  };
}

/**
 * Builds a release plan for selected packages.
 *
 * @param {PublishPackageMetadata[]} packages
 * @returns {Promise<ReleasePlan>}
 */
async function buildReleasePlan(packages) {
  /** @type {Map<string, { releaseType: import('./types.mjs').VersionType; customVersion?: string }>} */
  const strategies = new Map();

  for (const metadata of packages) {
    strategies.set(metadata.npmPackageName, await getReleaseStrategy(metadata));
  }

  return createReleasePlan(packages, strategies);
}

/**
 * Converts release plan entries into republish batch items.
 *
 * @param {ReleasePlanEntry[]} entries
 * @returns {{ metadata: PublishPackageMetadata; version: string }[]}
 */
function toRepublishItems(entries) {
  return entries.map((entry) => ({
    metadata: entry.metadata,
    version: entry.nextVersion,
  }));
}

/**
 * Returns release plan entries in dependency order.
 *
 * @param {ReleasePlan} releasePlan
 * @returns {ReleasePlanEntry[]}
 */
function getSortedReleasePlanEntries(releasePlan) {
  return sortPackagesByDependencies(getReleasePlanPackages(releasePlan)).map((metadata) => {
    const entry = releasePlan.get(metadata.npmPackageName);

    if (!entry) {
      throw new Error(`Missing release plan entry for "${metadata.npmPackageName}".`);
    }

    return entry;
  });
}

/**
 * Updates one package.json from the release plan and writes it once.
 *
 * @param {ReleasePlanEntry} entry
 * @param {ReleasePlan} releasePlan
 * @returns {Promise<void>}
 */
async function updatePackageJsonForRelease(entry, releasePlan) {
  const packageJsonPath = getPackageJsonPath(entry.metadata.directory);
  const content = await readFileByPath(packageJsonPath);
  const packageJson = parseData(content);

  packageJson.version = entry.nextVersion;
  updateInternalDependencyVersions(packageJson, releasePlan);

  await writeJson(packageJsonPath, packageJson, {
    indent: detectJsonIndent(content),
    trailingNewline: content.endsWith('\n'),
  });
}

/**
 * Updates every selected package.json using the release plan.
 *
 * @param {ReleasePlan} releasePlan
 * @returns {Promise<void>}
 */
async function updatePackageJsonForReleasePlan(releasePlan) {
  for (const entry of getReleasePlanEntries(releasePlan)) {
    await updatePackageJsonForRelease(entry, releasePlan);
  }
}

/**
 * Restores a package snapshot and preserves the original publish error.
 *
 * @param {Awaited<ReturnType<typeof createSnapshot>>} snapshot
 * @param {unknown} publishError
 * @returns {Promise<never>}
 */
async function rollbackAndThrow(snapshot, publishError) {
  try {
    await restoreSnapshot(snapshot);
  } catch (restoreError) {
    reportWarning(
      `Failed to restore package.json snapshot: ${
        restoreError instanceof Error ? restoreError.message : String(restoreError)
      }`,
    );
  }

  throw publishError;
}

/* -------------------------------------------------------------------------- */
/*                               PUBLIC API                                   */
/* -------------------------------------------------------------------------- */

/**
 * Republishes a package.
 *
 * @param {PublishPackageMetadata} metadata
 * @returns {Promise<void>}
 */
export async function republishPackage(metadata) {
  const username = await ensureLoggedIn();

  const releasePlan = await buildReleasePlan([metadata]);
  const [releaseEntry] = getReleasePlanEntries(releasePlan);
  const nextVersion = releaseEntry.nextVersion;

  const isConfirmed = await confirmRepublish(metadata, nextVersion);

  if (!isConfirmed) {
    return;
  }

  const snapshot = await createSnapshot(getReleasePlanPackages(releasePlan));

  try {
    await updatePackageJsonForReleasePlan(releasePlan);
    await republishPackageInternal(metadata, nextVersion, username);
  } catch (error) {
    await rollbackAndThrow(snapshot, error);
  }
}

/**
 * Republishes multiple packages.
 *
 * @param {PublishPackageMetadata[]} packages
 * @returns {Promise<void>}
 */
export async function republishPackages(packages) {
  if (packages.length === 0) {
    return;
  }

  const username = await ensureLoggedIn();

  const releasePlan = await buildReleasePlan(packages);

  const items = toRepublishItems(getSortedReleasePlanEntries(releasePlan));

  const isConfirmed = await confirmRepublishMany(items);

  if (!isConfirmed) {
    return;
  }

  const snapshot = await createSnapshot(getReleasePlanPackages(releasePlan));

  try {
    await updatePackageJsonForReleasePlan(releasePlan);

    await runBatchOperation({
      title: 'Republish Summary',
      items,
      operation: ({ metadata, version }) => republishPackageInternal(metadata, version, username),
      getItemName: ({ metadata }) => `${metadata.workspaceName} (${metadata.npmPackageName})`,
      continueOnError: false,
    });
  } catch (error) {
    await rollbackAndThrow(snapshot, error);
  }
}

/**
 * Republishes all packages.
 *
 * @param {PublishPackageMetadata[]} packages
 * @returns {Promise<void>}
 */
export async function republishAllPackages(packages) {
  await republishPackages(packages);
}
