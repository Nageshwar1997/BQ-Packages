import { DEPENDENCY_SCOPES } from './constants.mjs';

/**
 * @import { PackageMetadata } from './types.mjs'
 */

/* -------------------------------------------------------------------------- */
/*                             PRIVATE HELPERS                                */
/* -------------------------------------------------------------------------- */

/**
 * Builds a package lookup map.
 *
 * @param {PackageMetadata[]} packages
 * @returns {Map<string, PackageMetadata>}
 */
function buildPackageMap(packages) {
  return new Map(packages.map((pkg) => [pkg.npmPackageName, pkg]));
}

/**
 * Visits a package and its dependencies.
 *
 * @param {PackageMetadata} metadata
 * @param {Map<string, PackageMetadata>} packageMap
 * @param {Set<string>} visiting
 * @param {Set<string>} visited
 * @param {PackageMetadata[]} sortedPackages
 * @returns {void}
 */
function visit(metadata, packageMap, visiting, visited, sortedPackages) {
  if (visited.has(metadata.npmPackageName)) {
    return;
  }

  if (visiting.has(metadata.npmPackageName)) {
    throw new Error(`Circular dependency detected involving "${metadata.npmPackageName}".`);
  }

  visiting.add(metadata.npmPackageName);

  for (const dependency of metadata.dependencies) {
    if (dependency.scope !== DEPENDENCY_SCOPES.INTERNAL) {
      continue;
    }

    const dependencyPackage = packageMap.get(dependency.name);

    if (!dependencyPackage) {
      continue;
    }

    visit(dependencyPackage, packageMap, visiting, visited, sortedPackages);
  }

  visiting.delete(metadata.npmPackageName);

  visited.add(metadata.npmPackageName);

  sortedPackages.push(metadata);
}

/* -------------------------------------------------------------------------- */
/*                               PUBLIC API                                   */
/* -------------------------------------------------------------------------- */

/**
 * Sorts packages by dependency order.
 *
 * @param {PackageMetadata[]} packages
 * @returns {PackageMetadata[]}
 */
export function sortPackagesByDependencies(packages) {
  const packageMap = buildPackageMap(packages);

  const visiting = new Set();

  const visited = new Set();

  const sortedPackages = [];

  for (const metadata of packages) {
    visit(metadata, packageMap, visiting, visited, sortedPackages);
  }

  return sortedPackages;
}
