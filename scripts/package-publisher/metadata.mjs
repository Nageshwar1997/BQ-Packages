import { PACKAGE_SCOPE } from '../create-package/constants.mjs';
import { DEPENDENCY_SCOPES, DEPENDENCY_TYPES } from './constants.mjs';
import { getPackageInfo } from './npm.mjs';
import { getPackageJsonPath } from './paths.mjs';

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
 * @param {object[]} dependencies
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
 * Returns all package dependencies.
 *
 * @param {Record<string, any>} packageJson
 * @returns {{
 *   name: string;
 *   version: string;
 *   type: string;
 *   scope: string;
 * }[]}
 */
function getDependencies(packageJson) {
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
 * @param {{
 *   packageType: string;
 *   name: string;
 *   directory: string;
 * }} pkg
 */
export async function getPackageMetadata(pkg) {
  const packageJson = await readJson(getPackageJsonPath(pkg.directory));

  const packageInfo = await getPackageInfo(packageJson.name);

  return {
    packageType: pkg.packageType,
    name: pkg.name,
    packageName: packageJson.name,

    directory: pkg.directory,

    localVersion: packageJson.version,
    remoteVersion: packageInfo.version,

    published: packageInfo.published,

    status: null,

    dependencies: getDependencies(packageJson),
  };
}

/* -------------------------------------------------------------------------- */
/*                                  STATUS                                    */
/* -------------------------------------------------------------------------- */

/**
 * Returns the package status.
 *
 * @param {{
 *   published: boolean;
 *   localVersion: string;
 *   remoteVersion: string | null;
 * }}
 * @returns {string}
 */
function getPackageStatus({ published, localVersion, remoteVersion }) {
  if (!published) {
    return PACKAGE_STATUS.UNPUBLISHED;
  }

  if (localVersion === remoteVersion) {
    return PACKAGE_STATUS.SYNCED;
  }

  if (remoteVersion && localVersion > remoteVersion) {
    return PACKAGE_STATUS.UPDATE_AVAILABLE;
  }

  return PACKAGE_STATUS.OUTDATED;
}
