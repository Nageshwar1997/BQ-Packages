import semver from 'semver';

import { ValidationError } from '../common/errors.mjs';
import { isPackageNotFound } from '../common/npm.mjs';
import { parseData, runCommand } from '../common/utils.mjs';
import { DEPENDENCY_FIELDS } from './constants.mjs';
import { isInternalDependency } from './dependency-version.mjs';

/**
 * @import { PackageJson } from '../common/types.mjs'
 * @import { ReleasePlan } from './release-plan.mjs'
 */

/**
 * A package of the repository that the republished package asks for, but that nobody can install.
 *
 * - `not-published`: the package is not on npm at all;
 * - `no-matching-version`: it is on npm, but no version of it fits the range;
 * - `release-version`: it is in this release, and the version it is released with does not fit the range
 *   (and no version already on npm does).
 *
 * @typedef {{
 *   packageName: string;
 *   field: string;
 *   name: string;
 *   range: string;
 *   reason: 'not-published' | 'no-matching-version' | 'release-version';
 *   latestPublished: string | null;
 *   releaseVersion: string | null;
 * }} UnavailableDependency
 */

/**
 * @typedef {(command: string, args: string[]) => Promise<{ stdout: string }>} CommandRunner
 */

const DEFAULT_LOOKUP_CONCURRENCY = 8;

/* -------------------------------------------------------------------------- */
/*                              PUBLISHED VERSIONS                            */
/* -------------------------------------------------------------------------- */

/**
 * Asks npm for the versions that exist of each package. A package that was never published has an
 * empty list. A package that could not be asked (offline, npm failing) is in `failures`: not knowing
 * is not the same as "it does not exist".
 *
 * @param {Iterable<string>} names
 * @param {{ run?: CommandRunner; concurrency?: number }} [options]
 * @returns {Promise<{ versions: Map<string, string[]>; failures: Map<string, string> }>}
 */
export async function fetchPublishedVersions(names, options = {}) {
  const { run = runCommand, concurrency = DEFAULT_LOOKUP_CONCURRENCY } = options;

  /** @type {Map<string, string[]>} */
  const versions = new Map();
  /** @type {Map<string, string>} */
  const failures = new Map();
  const queue = [...new Set(names)];

  const work = async () => {
    for (let name = queue.shift(); name !== undefined; name = queue.shift()) {
      try {
        const { stdout } = await run('npm', ['view', name, 'versions', '--json']);
        const answer = stdout ? parseData(stdout) : [];

        // a list of versions, or a single string when only one version was ever published
        versions.set(
          name,
          [answer]
            .flat(2)
            .filter((version) => typeof version === 'string' && semver.valid(version) !== null),
        );
      } catch (error) {
        if (isPackageNotFound(error)) {
          versions.set(name, []);
        } else {
          failures.set(name, error instanceof Error ? error.message : String(error));
        }
      }
    }
  };

  await Promise.all(Array.from({ length: Math.min(concurrency, queue.length) }, work));

  return { versions, failures };
}

/* -------------------------------------------------------------------------- */
/*                                   THE CHECK                                */
/* -------------------------------------------------------------------------- */

/**
 * The packages of the repository whose versions on npm the check has to know: the ones some package.json
 * asks for in a range, and that the release itself does not already satisfy. A range that is not a range
 * (`workspace:*`, `file:`, `latest`) is not looked at.
 *
 * @param {ReadonlyMap<string, PackageJson>} packageJsons
 * @param {ReleasePlan} releasePlan
 * @returns {Set<string>}
 */
export function collectInternalDependencyNames(packageJsons, releasePlan) {
  /** @type {Set<string>} */
  const names = new Set();

  for (const packageJson of packageJsons.values()) {
    for (const field of DEPENDENCY_FIELDS) {
      for (const [name, range] of Object.entries(packageJson[field] ?? {})) {
        if (!isInternalDependency(name) || semver.validRange(range) === null) {
          continue;
        }

        const releaseVersion = releasePlan.get(name)?.nextVersion;

        if (releaseVersion === undefined || !semver.satisfies(releaseVersion, range)) {
          names.add(name);
        }
      }
    }
  }

  return names;
}

/**
 * Finds the dependencies on a package of the repository that could not be installed once the package
 * is published: a range that no version on npm fits, and that the release does not satisfy either.
 *
 * `packageJson` is the one the republish is about to write (the ranges already moved), and a package
 * of the same release counts with the version it is released with, since it is published before the
 * packages that depend on it.
 *
 * @param {PackageJson} packageJson
 * @param {{ releasePlan: ReleasePlan; publishedVersions: ReadonlyMap<string, string[]> }} context
 * @returns {UnavailableDependency[]}
 */
export function findUnavailableInternalDependencies(packageJson, context) {
  const { releasePlan, publishedVersions } = context;
  const packageName = packageJson.name ?? '';

  /** @type {UnavailableDependency[]} */
  const unavailable = [];

  for (const field of DEPENDENCY_FIELDS) {
    for (const [name, range] of Object.entries(packageJson[field] ?? {})) {
      if (!isInternalDependency(name) || semver.validRange(range) === null) {
        continue;
      }

      const releaseVersion = releasePlan.get(name)?.nextVersion ?? null;

      if (releaseVersion !== null && semver.satisfies(releaseVersion, range)) {
        continue;
      }

      const published = publishedVersions.get(name) ?? [];

      if (semver.maxSatisfying(published, range) !== null) {
        continue;
      }

      unavailable.push({
        packageName,
        field,
        name,
        range,
        reason:
          releaseVersion !== null
            ? 'release-version'
            : published.length === 0
              ? 'not-published'
              : 'no-matching-version',
        latestPublished: published.length > 0 ? semver.rsort([...published])[0] : null,
        releaseVersion,
      });
    }
  }

  return unavailable;
}

/**
 * Says what is wrong with one dependency, and what to do about it.
 *
 * @param {UnavailableDependency} problem
 * @returns {string[]}
 */
function describeProblem(problem) {
  const { field, name, range, reason, latestPublished, releaseVersion } = problem;
  const asked = `${field}: ${name} ${range}`;

  switch (reason) {
    case 'not-published':
      return [
        `- ${asked}`,
        `    ${name} is not on npm at all.`,
        `    Publish it first, or take it out of the dependencies.`,
      ];

    case 'release-version':
      return [
        `- ${asked}`,
        `    ${name} is in this release as ${String(releaseVersion)}, which the range does not allow.`,
        `    Change the range so it allows ${String(releaseVersion)}.`,
      ];

    default:
      return [
        `- ${asked}`,
        `    npm has no version of ${name} that fits it (the latest on npm is ${String(latestPublished)}).`,
        `    Add ${name} to this republish, or change the range to one npm has (e.g. ^${String(latestPublished)}).`,
      ];
  }
}

/**
 * Builds the message that stops a republish, grouped by the package that cannot be published.
 *
 * @param {UnavailableDependency[]} unavailable
 * @returns {string}
 */
export function buildUnavailableMessage(unavailable) {
  /** @type {Map<string, UnavailableDependency[]>} */
  const byPackage = new Map();

  for (const problem of unavailable) {
    byPackage.set(problem.packageName, [...(byPackage.get(problem.packageName) ?? []), problem]);
  }

  const lines = [
    'Not republished: a package would depend on a version that nobody can install.',
    '',
  ];

  for (const [packageName, problems] of byPackage) {
    lines.push(packageName);

    for (const problem of problems) {
      lines.push(...describeProblem(problem).map((line) => `  ${line}`));
    }

    lines.push('');
  }

  lines.push('Nothing was changed.');

  return lines.join('\n');
}

/**
 * Stops a republish whose package.json files, as they are about to be written, depend on a package of
 * the repository that npm cannot give: it would be published, and then fail to install for everyone.
 * Nothing has been written when this runs, so there is nothing to put back.
 *
 * It checks only what it can know: if npm cannot be asked, it stops too (a check that passes when it
 * could not look is not a check).
 *
 * @param {ReadonlyMap<string, PackageJson>} packageJsons The package.json files as they will be written.
 * @param {ReleasePlan} releasePlan
 * @param {{ run?: CommandRunner; concurrency?: number }} [options]
 * @returns {Promise<void>}
 * @throws {ValidationError}
 */
export async function assertInternalDependenciesAvailable(packageJsons, releasePlan, options = {}) {
  const { versions, failures } = await fetchPublishedVersions(
    collectInternalDependencyNames(packageJsons, releasePlan),
    options,
  );

  if (failures.size > 0) {
    const list = [...failures].map(([name, message]) => `  ${name}: ${message}`).join('\n');

    throw new ValidationError(
      `Not republished: npm could not be asked if these packages exist, so their dependents cannot be checked. Try again.\n${list}\n\nNothing was changed.`,
    );
  }

  const unavailable = [...packageJsons.values()].flatMap((packageJson) =>
    findUnavailableInternalDependencies(packageJson, { releasePlan, publishedVersions: versions }),
  );

  if (unavailable.length > 0) {
    throw new ValidationError(buildUnavailableMessage(unavailable));
  }
}
