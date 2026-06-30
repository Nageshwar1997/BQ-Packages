import { calculateVersion } from './version.mjs';

/**
 * @import { PackageMetadata, VersionType } from './types.mjs'
 */

/**
 * @typedef {{
 *   metadata: PackageMetadata;
 *   currentVersion: string;
 *   nextVersion: string;
 *   releaseType: VersionType;
 * }} ReleasePlanEntry
 */

/**
 * @typedef {Map<string, ReleasePlanEntry>} ReleasePlan
 */

/* -------------------------------------------------------------------------- */
/*                               PUBLIC API                                   */
/* -------------------------------------------------------------------------- */

/**
 * Creates an empty release plan.
 *
 * @returns {ReleasePlan}
 */
export function createEmptyReleasePlan() {
  return new Map();
}

/**
 * Adds a package to a release plan.
 *
 * @param {ReleasePlan} releasePlan
 * @param {ReleasePlanEntry} entry
 * @returns {ReleasePlan}
 */
export function addReleasePlanEntry(releasePlan, entry) {
  releasePlan.set(entry.metadata.npmPackageName, entry);

  return releasePlan;
}

/**
 * Generates a release plan from selected packages and release strategies.
 *
 * @param {PackageMetadata[]} packages
 * @param {Map<string, { releaseType: VersionType; customVersion?: string }>} strategies
 * @returns {ReleasePlan}
 */
export function createReleasePlan(packages, strategies) {
  const releasePlan = createEmptyReleasePlan();

  for (const metadata of packages) {
    const strategy = strategies.get(metadata.npmPackageName);

    if (!strategy) {
      throw new Error(`Missing release strategy for "${metadata.npmPackageName}".`);
    }

    const currentVersion = metadata.localVersion;
    const nextVersion = calculateVersion(
      currentVersion,
      strategy.releaseType,
      strategy.customVersion,
      metadata.npmPackageName,
    );

    addReleasePlanEntry(releasePlan, {
      metadata,
      currentVersion,
      nextVersion,
      releaseType: strategy.releaseType,
    });
  }

  return releasePlan;
}

/**
 * Returns release plan entries in insertion order.
 *
 * @param {ReleasePlan} releasePlan
 * @returns {ReleasePlanEntry[]}
 */
export function getReleasePlanEntries(releasePlan) {
  return [...releasePlan.values()];
}

/**
 * Returns release plan package metadata in insertion order.
 *
 * @param {ReleasePlan} releasePlan
 * @returns {PackageMetadata[]}
 */
export function getReleasePlanPackages(releasePlan) {
  return getReleasePlanEntries(releasePlan).map((entry) => entry.metadata);
}
