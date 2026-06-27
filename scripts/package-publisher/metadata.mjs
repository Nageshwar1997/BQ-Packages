import semver from 'semver';
import { PACKAGE_SCOPE } from '../create-package/constants.mjs';
import { DEPENDENCY_SCOPES, DEPENDENCY_TYPES, PACKAGE_STATUS } from './constants.mjs';
import { getPackageInfo } from './npm.mjs';
import { getPackageJsonPath } from './paths.mjs';
import { readJson } from './utils.mjs';

/**
 * @import {
 *   Dependency,
 *   PackageJson,
 *   PackageMetadata,
 *   WorkspacePackage,
 * } from './types.mjs'
 */

/* -------------------------------------------------------------------------- */
/*                               DEPENDENCIES                                 */
/* -------------------------------------------------------------------------- */

/**
 * Returns the dependency scope.
 *
 * @param {string} packageName
 * @returns {string}
 */
function getDependencyScope(packageName) {
  return packageName.startsWith(`${PACKAGE_SCOPE}/`)
    ? DEPENDENCY_SCOPES.INTERNAL
    : DEPENDENCY_SCOPES.EXTERNAL;
}

/**
 * Adds dependencies to the metadata collection.
 *
 * @param {Dependency[]} dependencies
 * @param {Record<string, string> | undefined} records
 * @param {string} type
 * @returns {void}
 */
function addDependencies(dependencies, records, type) {
  if (!records) return;

  for (const [name, version] of Object.entries(records)) {
    dependencies.push({
      name,
      version,
      type,
      scope: getDependencyScope(name),
    });
  }
}

/**
 * @param {PackageJson} packageJson
 * @returns {Dependency[]}
 */
function getDependencies(packageJson) {
  const collectedDependencies = [];

  addDependencies(collectedDependencies, packageJson.dependencies, DEPENDENCY_TYPES.DEPENDENCY);

  addDependencies(
    collectedDependencies,
    packageJson.devDependencies,
    DEPENDENCY_TYPES.DEV_DEPENDENCY,
  );

  addDependencies(
    collectedDependencies,
    packageJson.peerDependencies,
    DEPENDENCY_TYPES.PEER_DEPENDENCY,
  );

  addDependencies(
    collectedDependencies,
    packageJson.optionalDependencies,
    DEPENDENCY_TYPES.OPTIONAL_DEPENDENCY,
  );

  return collectedDependencies;
}

/* -------------------------------------------------------------------------- */
/*                              PACKAGE METADATA                              */
/* -------------------------------------------------------------------------- */

/**
 * Returns runtime metadata for a workspace package.
 *
 * @param {WorkspacePackage} pkg
 * @returns {Promise<PackageMetadata>}
 */
export async function getPackageMetadata(pkg) {
  const packageJson = await readJson(getPackageJsonPath(pkg.directory));

  const packageInfo = await getPackageInfo(packageJson.name);

  const metadata = {
    packageType: pkg.packageType,
    name: pkg.name,
    packageName: packageJson.name,

    directory: pkg.directory,

    localVersion: packageJson.version,
    remoteVersion: packageInfo.version,

    published: packageInfo.published,

    publishConfig: packageJson.publishConfig ?? null,

    dependencies: getDependencies(packageJson),
  };

  const status = getPackageStatus(metadata);

  return { ...metadata, status };
}

/* -------------------------------------------------------------------------- */
/*                                  STATUS                                    */
/* -------------------------------------------------------------------------- */

/**
 * @param {PackageMetadata} metadata
 * @returns {string}
 */
function getPackageStatus({ published, localVersion, remoteVersion }) {
  if (!published) {
    return PACKAGE_STATUS.UNPUBLISHED;
  }

  if (semver.eq(localVersion, remoteVersion)) {
    return PACKAGE_STATUS.SYNCED;
  }

  if (semver.gt(localVersion, remoteVersion)) {
    return PACKAGE_STATUS.UPDATE_AVAILABLE;
  }

  return PACKAGE_STATUS.OUTDATED;
}
