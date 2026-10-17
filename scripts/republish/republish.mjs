import { ensureLoggedIn } from '../common/auth.mjs';
import { runBatchOperation } from '../common/batch-operation.mjs';
import { sortPackagesByDependencies } from '../common/dependency-sort.mjs';
import { republishToNpm } from '../common/npm.mjs';
import {
  buildWorkspacePackage,
  installWorkspaceDependencies,
} from '../common/package-lifecycle.mjs';
import { getPackageJsonPath } from '../common/paths.mjs';
import { reportInfo, reportSuccess, reportWarning } from '../common/reporter.mjs';
import { parseData, readFileByPath, writeJson } from '../common/utils.mjs';
import { VERSION_TYPES } from './constants.mjs';
import { applyDependencyUpdates, planDependencyUpdatesFor } from './dependency-update.mjs';
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
import {
  createLockfileSnapshot,
  createSnapshot,
  restoreLockfileSnapshot,
  restoreSnapshot,
} from './rollback.mjs';
import { detectJsonIndent } from './utils.mjs';
import { validateRepublish } from './validators.mjs';
/**
 * @import { PublishPackageMetadata } from '../common/types.mjs'
 * @import { DependencyUpdatePlan } from './dependency-update.mjs'
 * @import { ReleasePlan, ReleasePlanEntry } from './release-plan.mjs'
 */

/* -------------------------------------------------------------------------- */
/*                             PRIVATE HELPERS                                */
/* -------------------------------------------------------------------------- */

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

  await buildWorkspacePackage(metadata);
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
 * Looks up the latest version of every dependency of the packages of a release, and works out what
 * the release does with each (see `planDependencyUpdates`). Nothing is written yet: the plan is shown
 * with the confirmation, and applied only after it.
 *
 * A name that npm cannot be asked about (offline) is left as it is, with a warning: the republish goes
 * on, it is not stopped by a lookup.
 *
 * @param {ReleasePlan} releasePlan
 * @returns {Promise<Map<string, DependencyUpdatePlan>>}
 */
async function buildDependencyUpdatePlans(releasePlan) {
  reportInfo('Checking the latest versions of the dependencies...');

  /** @type {Map<string, import('../common/types.mjs').PackageJson>} */
  const packageJsons = new Map();

  for (const { metadata } of getReleasePlanEntries(releasePlan)) {
    const content = await readFileByPath(getPackageJsonPath(metadata.directory));

    packageJsons.set(metadata.npmPackageName, parseData(content));
  }

  const { plans, failures } = await planDependencyUpdatesFor(packageJsons, { releasePlan });

  for (const [name, message] of failures) {
    reportWarning(`Could not ask npm about "${name}" (${message}). It is left as it is.`);
  }

  return plans;
}

/**
 * Converts release plan entries into republish batch items.
 *
 * @param {ReleasePlanEntry[]} entries
 * @param {Map<string, DependencyUpdatePlan>} dependencyPlans
 * @returns {{
 *   metadata: PublishPackageMetadata;
 *   version: string;
 *   dependencyPlan: DependencyUpdatePlan;
 * }[]}
 */
function toRepublishItems(entries, dependencyPlans) {
  return entries.map((entry) => ({
    metadata: entry.metadata,
    version: entry.nextVersion,
    dependencyPlan: dependencyPlans.get(entry.metadata.npmPackageName) ?? {
      updates: [],
      skipped: [],
    },
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
 * Updates one package.json from the release plan and writes it once: its version, the packages of
 * the same release that it depends on (they take the version they are released with), and every
 * other dependency that has a newer version (see `planDependencyUpdates`).
 *
 * @param {ReleasePlanEntry} entry
 * @param {ReleasePlan} releasePlan
 * @param {Map<string, DependencyUpdatePlan>} dependencyPlans
 * @returns {Promise<void>}
 */
export async function updatePackageJsonForRelease(entry, releasePlan, dependencyPlans) {
  const packageJsonPath = getPackageJsonPath(entry.metadata.directory);
  const content = await readFileByPath(packageJsonPath);
  const packageJson = parseData(content);

  packageJson.version = entry.nextVersion;
  updateInternalDependencyVersions(packageJson, releasePlan);
  applyDependencyUpdates(
    packageJson,
    dependencyPlans.get(entry.metadata.npmPackageName)?.updates ?? [],
  );

  await writeJson(packageJsonPath, packageJson, {
    indent: detectJsonIndent(content),
    trailingNewline: content.endsWith('\n'),
  });
}

/**
 * Updates every selected package.json using the release plan.
 *
 * @param {ReleasePlan} releasePlan
 * @param {Map<string, DependencyUpdatePlan>} dependencyPlans
 * @returns {Promise<void>}
 */
async function updatePackageJsonForReleasePlan(releasePlan, dependencyPlans) {
  for (const entry of getReleasePlanEntries(releasePlan)) {
    await updatePackageJsonForRelease(entry, releasePlan, dependencyPlans);
  }
}

/**
 * Restores a package snapshot (and the lockfile, which `npm install` rewrote) and preserves the
 * original publish error.
 *
 * @param {Awaited<ReturnType<typeof createSnapshot>>} snapshot
 * @param {Awaited<ReturnType<typeof createLockfileSnapshot>>} lockfileSnapshot
 * @param {unknown} publishError
 * @returns {Promise<never>}
 */
async function rollbackAndThrow(snapshot, lockfileSnapshot, publishError) {
  try {
    await restoreSnapshot(snapshot);
    await restoreLockfileSnapshot(lockfileSnapshot);
  } catch (restoreError) {
    reportWarning(
      `Failed to restore the package.json files and the lockfile: ${
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
  const dependencyPlans = await buildDependencyUpdatePlans(releasePlan);

  const isConfirmed = await confirmRepublish(
    metadata,
    nextVersion,
    dependencyPlans.get(metadata.npmPackageName),
  );

  if (!isConfirmed) {
    return;
  }

  const snapshot = await createSnapshot(getReleasePlanPackages(releasePlan));
  const lockfileSnapshot = await createLockfileSnapshot();

  try {
    await updatePackageJsonForReleasePlan(releasePlan, dependencyPlans);
    await installWorkspaceDependencies();
    await republishPackageInternal(metadata, nextVersion, username);
  } catch (error) {
    await rollbackAndThrow(snapshot, lockfileSnapshot, error);
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
  const dependencyPlans = await buildDependencyUpdatePlans(releasePlan);

  const items = toRepublishItems(getSortedReleasePlanEntries(releasePlan), dependencyPlans);

  const isConfirmed = await confirmRepublishMany(items);

  if (!isConfirmed) {
    return;
  }

  const snapshot = await createSnapshot(getReleasePlanPackages(releasePlan));
  const lockfileSnapshot = await createLockfileSnapshot();

  try {
    await updatePackageJsonForReleasePlan(releasePlan, dependencyPlans);
    await installWorkspaceDependencies();

    await runBatchOperation({
      title: 'Republish Summary',
      items,
      operation: ({ metadata, version }) => republishPackageInternal(metadata, version, username),
      getItemName: ({ metadata }) => `${metadata.workspaceName} (${metadata.npmPackageName})`,
      continueOnError: false,
    });
  } catch (error) {
    await rollbackAndThrow(snapshot, lockfileSnapshot, error);
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
