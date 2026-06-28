import semver from 'semver';
import { PACKAGE_SCOPE } from '../create-package/constants.mjs';
import { DEPENDENCY_SCOPES, DEPENDENCY_TYPES, PACKAGE_STATUS } from './constants.mjs';
import { getPackageInfo } from './npm.mjs';
import { findPackages } from './package.mjs';
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
 * @returns {Dependency['scope']}
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
 * @param {Dependency['type']} type
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
 * Returns all package dependencies.
 *
 * @param {PackageJson} packageJson
 * @returns {Dependency[]}
 */
function getDependencies(packageJson) {
  /** @type {Dependency[]} */
  const dependencies = [];

  addDependencies(dependencies, packageJson.dependencies, DEPENDENCY_TYPES.DEPENDENCY);

  addDependencies(dependencies, packageJson.devDependencies, DEPENDENCY_TYPES.DEV_DEPENDENCY);

  addDependencies(dependencies, packageJson.peerDependencies, DEPENDENCY_TYPES.PEER_DEPENDENCY);

  addDependencies(
    dependencies,
    packageJson.optionalDependencies,
    DEPENDENCY_TYPES.OPTIONAL_DEPENDENCY,
  );

  return dependencies;
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
    workspaceName: pkg.workspaceName,
    npmPackageName: packageJson.name,

    directory: pkg.directory,

    localVersion: packageJson.version,
    remoteVersion: packageInfo.version,

    published: packageInfo.published,

    publishConfig: packageJson.publishConfig ?? null,

    dependencies: getDependencies(packageJson),
  };

  return {
    ...metadata,
    status: getPackageStatus(metadata),
  };
}

/**
 * Returns metadata for all workspace packages.
 *
 * @returns {Promise<PackageMetadata[]>}
 */
export async function getPackagesMetadata() {
  const packages = await findPackages();

  return Promise.all(packages.map(getPackageMetadata));
}

/* -------------------------------------------------------------------------- */
/*                                  STATUS                                    */
/* -------------------------------------------------------------------------- */

/**
 * Returns the package status.
 *
 * @param {Pick<PackageMetadata, 'published' | 'localVersion' | 'remoteVersion'>} metadata
 * @returns {PackageMetadata['status']}
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
