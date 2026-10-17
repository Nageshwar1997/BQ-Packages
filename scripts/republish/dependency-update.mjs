import semver from 'semver';

import { isPackageNotFound } from '../common/npm.mjs';
import { parseData, runCommand } from '../common/utils.mjs';
import { DEPENDENCY_FIELDS, DEPENDENCY_UPDATE_EXCLUDED_PACKAGES } from './constants.mjs';
import { isInternalDependency, parseSupportedDependencyVersion } from './dependency-version.mjs';

/**
 * @import { PackageJson } from '../common/types.mjs'
 * @import { ReleasePlan } from './release-plan.mjs'
 */

/**
 * One dependency that moves to a newer version.
 *
 * @typedef {{
 *   name: string;
 *   field: string;
 *   from: string;
 *   to: string;
 *   change: 'major' | 'minor' | 'patch' | 'other';
 *   internal: boolean;
 * }} DependencyUpdate
 */

/**
 * One dependency that is left as it is, and why.
 *
 * @typedef {{
 *   name: string;
 *   field: string;
 *   range: string;
 *   reason: 'excluded' | 'pinned' | 'peer' | 'range' | 'unknown';
 * }} SkippedDependency
 */

/**
 * What a republish does with the dependencies of one package.
 *
 * @typedef {{ updates: DependencyUpdate[]; skipped: SkippedDependency[] }} DependencyUpdatePlan
 */

/**
 * @typedef {(command: string, args: string[]) => Promise<{ stdout: string }>} CommandRunner
 */

const DEFAULT_LOOKUP_CONCURRENCY = 8;

/* -------------------------------------------------------------------------- */
/*                               LATEST VERSIONS                              */
/* -------------------------------------------------------------------------- */

/**
 * Asks npm for the latest version of each package. A package that is not on npm (a package of the
 * repository that was never published) has no latest version and is left out; so is one that could
 * not be asked (offline): the caller is told which, and the republish goes on without them.
 *
 * @param {Iterable<string>} names
 * @param {{ run?: CommandRunner; concurrency?: number }} [options]
 * @returns {Promise<{ versions: Map<string, string>; failures: Map<string, string> }>}
 */
export async function fetchLatestVersions(names, options = {}) {
  const { run = runCommand, concurrency = DEFAULT_LOOKUP_CONCURRENCY } = options;

  /** @type {Map<string, string>} */
  const versions = new Map();
  /** @type {Map<string, string>} */
  const failures = new Map();
  const queue = [...new Set(names)];

  const work = async () => {
    for (let name = queue.shift(); name !== undefined; name = queue.shift()) {
      try {
        const { stdout } = await run('npm', ['view', name, 'dist-tags.latest', '--json']);
        const answer = stdout ? parseData(stdout) : null;
        // npm answers with a list (`["4.6.7"]`) when it is run inside a workspace, and a string elsewhere
        const version = Array.isArray(answer) ? answer.at(-1) : answer;

        if (typeof version === 'string' && semver.valid(version)) {
          versions.set(name, version);
        }
      } catch (error) {
        if (!isPackageNotFound(error)) {
          failures.set(name, error instanceof Error ? error.message : String(error));
        }
      }
    }
  };

  await Promise.all(Array.from({ length: Math.min(concurrency, queue.length) }, work));

  return { versions, failures };
}

/* -------------------------------------------------------------------------- */
/*                                    PLAN                                    */
/* -------------------------------------------------------------------------- */

/**
 * Returns whether a dependency has to be looked up on npm: the ones a plan can move.
 *
 * @param {string} name
 * @param {ReleasePlan} releasePlan
 * @returns {boolean}
 */
function needsLookup(name, releasePlan) {
  return !(isInternalDependency(name) && releasePlan.has(name));
}

/**
 * Returns the names of the dependencies of a package.json that have to be looked up on npm.
 *
 * @param {PackageJson} packageJson
 * @param {ReleasePlan} [releasePlan]
 * @returns {string[]}
 */
export function collectDependencyNames(packageJson, releasePlan = new Map()) {
  /** @type {Set<string>} */
  const names = new Set();

  for (const field of DEPENDENCY_FIELDS) {
    for (const name of Object.keys(packageJson[field] ?? {})) {
      if (needsLookup(name, releasePlan)) {
        names.add(name);
      }
    }
  }

  return [...names];
}

/**
 * Works out what a republish does with every dependency of a package.
 *
 * Every dependency goes to the latest version of the registry, in the style of its range (`^`, `~`),
 * except:
 *
 * - the packages of the repository that are in the same release: they take the version they are
 *   being released with (see `updateInternalDependencyVersions`);
 * - `excluded` packages (the compiler);
 * - an exact version (`1.0.1`): someone pinned it on purpose, and a pin is the one thing nobody
 *   should move by itself;
 * - the `peerDependencies` of other people's packages: a peer range says what the package works
 *   with (`react ^19.0.0`), and raising it to the newest would shut out everyone who has an older
 *   one. The packages of the repository are the exception: their peer range is raised, so an app is
 *   never left with a peer that lacks a fix;
 * - a range that is not a single version (`^7 || ^8`, `>=18`, a tag, `workspace:`);
 * - a package that npm does not know.
 *
 * A dependency is never moved to an older version.
 *
 * @param {PackageJson} packageJson
 * @param {ReadonlyMap<string, string>} latestVersions
 * @param {{ releasePlan?: ReleasePlan; excluded?: readonly string[] }} [options]
 * @returns {DependencyUpdatePlan}
 */
export function planDependencyUpdates(packageJson, latestVersions, options = {}) {
  const { releasePlan = new Map(), excluded = DEPENDENCY_UPDATE_EXCLUDED_PACKAGES } = options;

  /** @type {DependencyUpdate[]} */
  const updates = [];
  /** @type {SkippedDependency[]} */
  const skipped = [];

  for (const field of DEPENDENCY_FIELDS) {
    for (const [name, range] of Object.entries(packageJson[field] ?? {})) {
      const internal = isInternalDependency(name);

      if (!needsLookup(name, releasePlan)) {
        continue;
      }

      /** @param {SkippedDependency['reason']} reason */
      const skip = (reason) => {
        skipped.push({ name, field, range, reason });
      };

      if (excluded.includes(name)) {
        skip('excluded');
        continue;
      }

      const parsed = parseSupportedDependencyVersion(range);

      if (!parsed) {
        skip('range');
        continue;
      }

      if (parsed.prefix === '') {
        skip('pinned');
        continue;
      }

      if (field === 'peerDependencies' && !internal) {
        skip('peer');
        continue;
      }

      const latest = latestVersions.get(name);

      if (!latest) {
        skip('unknown');
        continue;
      }

      if (!semver.gt(latest, parsed.version)) {
        continue;
      }

      updates.push({
        name,
        field,
        from: range,
        to: `${parsed.prefix}${latest}`,
        change: toChange(parsed.version, latest),
        internal,
      });
    }
  }

  return { updates, skipped };
}

/**
 * Names the size of the step from one version to a newer one.
 *
 * @param {string} from
 * @param {string} to
 * @returns {'major' | 'minor' | 'patch' | 'other'}
 */
function toChange(from, to) {
  const diff = semver.diff(from, to);

  if (diff === 'major' || diff === 'premajor') {
    return 'major';
  }

  if (diff === 'minor' || diff === 'preminor') {
    return 'minor';
  }

  if (diff === 'patch' || diff === 'prepatch') {
    return 'patch';
  }

  return 'other';
}

/* -------------------------------------------------------------------------- */
/*                                    APPLY                                   */
/* -------------------------------------------------------------------------- */

/**
 * Writes the updates of a plan into a parsed package.json.
 *
 * @param {PackageJson} packageJson
 * @param {DependencyUpdate[]} updates
 * @returns {boolean} Whether anything changed.
 */
export function applyDependencyUpdates(packageJson, updates) {
  let changed = false;

  for (const { name, field, to } of updates) {
    const record = packageJson[field];

    if (!record || record[name] === to) {
      continue;
    }

    record[name] = to;
    changed = true;
  }

  return changed;
}

/**
 * Plans the updates of several package.json files with one round of lookups.
 *
 * @param {Map<string, PackageJson>} packageJsons By the name of the package.
 * @param {{ releasePlan?: ReleasePlan; excluded?: readonly string[]; run?: CommandRunner }} [options]
 * @returns {Promise<{
 *   plans: Map<string, DependencyUpdatePlan>;
 *   failures: Map<string, string>;
 * }>}
 */
export async function planDependencyUpdatesFor(packageJsons, options = {}) {
  const { releasePlan = new Map(), excluded, run } = options;

  /** @type {Set<string>} */
  const names = new Set();

  for (const packageJson of packageJsons.values()) {
    for (const name of collectDependencyNames(packageJson, releasePlan)) {
      names.add(name);
    }
  }

  const { versions, failures } = await fetchLatestVersions(names, { run });

  /** @type {Map<string, DependencyUpdatePlan>} */
  const plans = new Map();

  for (const [packageName, packageJson] of packageJsons) {
    plans.set(packageName, planDependencyUpdates(packageJson, versions, { releasePlan, excluded }));
  }

  return { plans, failures };
}
