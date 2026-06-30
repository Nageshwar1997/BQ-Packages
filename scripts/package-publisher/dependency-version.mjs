import semver from 'semver';

import { PACKAGE_SCOPE } from '../create-package/constants.mjs';

/**
 * @import { PackageJson } from './types.mjs'
 * @import { ReleasePlan } from './release-plan.mjs'
 */

const DEPENDENCY_FIELDS = [
  'dependencies',
  'devDependencies',
  'peerDependencies',
  'optionalDependencies',
];

const UNSUPPORTED_DEPENDENCY_VALUE_PREFIXES = ['workspace:', 'file:', 'link:', 'github:'];

/**
 * @typedef {'^' | '~' | ''} SemverPrefix
 */

/* -------------------------------------------------------------------------- */
/*                              PRIVATE HELPERS                               */
/* -------------------------------------------------------------------------- */

/**
 * Returns whether a dependency belongs to Beautinique packages.
 *
 * @param {string} packageName
 * @returns {boolean}
 */
function isInternalDependency(packageName) {
  return packageName.startsWith(`${PACKAGE_SCOPE}/`);
}

/**
 * Returns a supported semver prefix and version.
 *
 * @param {string} value
 * @returns {{ prefix: SemverPrefix; version: string } | null}
 */
function parseSupportedDependencyVersion(value) {
  if (
    value === '*' ||
    value === 'latest' ||
    UNSUPPORTED_DEPENDENCY_VALUE_PREFIXES.some((prefix) => value.startsWith(prefix))
  ) {
    return null;
  }

  /** @type {SemverPrefix} */
  const prefix = value.startsWith('^') || value.startsWith('~') ? value[0] : '';
  const version = prefix ? value.slice(1) : value;

  if (!semver.valid(version)) {
    return null;
  }

  return { prefix, version };
}

/**
 * Updates a dependency record.
 *
 * @param {Record<string, string> | undefined} dependencies
 * @param {ReleasePlan} releasePlan
 * @returns {boolean}
 */
function updateDependencyRecord(dependencies, releasePlan) {
  if (!dependencies) {
    return false;
  }

  let changed = false;

  for (const [dependencyName, dependencyVersion] of Object.entries(dependencies)) {
    if (!isInternalDependency(dependencyName)) {
      continue;
    }

    const plannedDependency = releasePlan.get(dependencyName);

    if (!plannedDependency) {
      continue;
    }

    const parsedVersion = parseSupportedDependencyVersion(dependencyVersion);

    if (!parsedVersion) {
      continue;
    }

    const nextDependencyVersion = `${parsedVersion.prefix}${plannedDependency.nextVersion}`;

    if (dependencyVersion === nextDependencyVersion) {
      continue;
    }

    dependencies[dependencyName] = nextDependencyVersion;
    changed = true;
  }

  return changed;
}

/* -------------------------------------------------------------------------- */
/*                               PUBLIC API                                   */
/* -------------------------------------------------------------------------- */

/**
 * Updates selected internal dependency versions in a parsed package.json.
 *
 * @param {PackageJson} packageJson
 * @param {ReleasePlan} releasePlan
 * @returns {boolean}
 */
export function updateInternalDependencyVersions(packageJson, releasePlan) {
  let changed = false;

  for (const dependencyField of DEPENDENCY_FIELDS) {
    if (updateDependencyRecord(packageJson[dependencyField], releasePlan)) {
      changed = true;
    }
  }

  return changed;
}
