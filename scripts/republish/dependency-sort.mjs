import { DEPENDENCY_SCOPES } from '../common/constants.mjs';

/**
 * @import { PackageMetadata } from './types.mjs'
 */

/**
 * @typedef {'visiting' | 'visited'} VisitState
 */

/**
 * @typedef {{
 *   packageMap: Map<string, PackageMetadata>;
 *   visitState: Map<string, VisitState>;
 *   sortedPackages: PackageMetadata[];
 * }} DependencySortContext
 */

/* -------------------------------------------------------------------------- */
/*                              PRIVATE HELPERS                               */
/* -------------------------------------------------------------------------- */

/**
 * Creates a package lookup map.
 *
 * @param {PackageMetadata[]} packages
 * @returns {Map<string, PackageMetadata>}
 */
function createPackageMap(packages) {
  return new Map(packages.map((pkg) => [pkg.npmPackageName, pkg]));
}

/**
 * Visits a package and its internal dependencies.
 *
 * @param {PackageMetadata} metadata
 * @param {DependencySortContext} context
 * @returns {void}
 */
function visit(metadata, context) {
  const state = context.visitState.get(metadata.npmPackageName);

  if (state === 'visited') {
    return;
  }

  if (state === 'visiting') {
    throw new Error(`Circular dependency detected involving "${metadata.npmPackageName}".`);
  }

  context.visitState.set(metadata.npmPackageName, 'visiting');

  for (const dependency of metadata.dependencies) {
    if (dependency.scope !== DEPENDENCY_SCOPES.INTERNAL) {
      continue;
    }

    const dependencyPackage = context.packageMap.get(dependency.name);

    if (!dependencyPackage) {
      continue;
    }

    visit(dependencyPackage, context);
  }

  context.visitState.set(metadata.npmPackageName, 'visited');

  context.sortedPackages.push(metadata);
}

/* -------------------------------------------------------------------------- */
/*                               PUBLIC API                                   */
/* -------------------------------------------------------------------------- */

/**
 * Sorts packages by dependency order.
 *
 * Internal dependencies are always ordered before the packages that depend
 * on them.
 *
 * @param {PackageMetadata[]} packages
 * @returns {PackageMetadata[]}
 */
export function sortPackagesByDependencies(packages) {
  /** @type {DependencySortContext} */
  const context = {
    packageMap: createPackageMap(packages),
    visitState: new Map(),
    sortedPackages: [],
  };

  for (const metadata of packages) {
    visit(metadata, context);
  }

  return context.sortedPackages;
}
