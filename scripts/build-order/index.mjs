import { DEPENDENCY_SCOPES, EXIT_CODES, PACKAGE_SCOPE } from '../common/constants.mjs';
import { sortPackagesByDependencies } from '../common/dependency-sort.mjs';
import { findPackages } from '../common/package.mjs';
import { getPackageJsonPath } from '../common/paths.mjs';
import { reportError, reportInfo, reportSuccess } from '../common/reporter.mjs';
import { exit, readJson, runInteractiveCommand } from '../common/utils.mjs';

/**
 * @import { PublishPackageMetadata } from '../common/types.mjs'
 */

/*
 * `npm run build --workspaces` (or `--workspaces` for `lint`/`typecheck`,
 * which don't have this problem) runs each workspace's script in whatever
 * order npm's workspace glob happens to resolve - alphabetical directory
 * order, unrelated to which package depends on which.
 *
 * Every package's `postbuild` generates declarations via `tsc`, which
 * resolves sibling `@beautinique/*` imports through the workspace symlinks
 * in `node_modules` - it needs that dependency's `dist/*.d.ts` to already
 * exist. Building out of dependency order means a package can build before
 * the package it imports from has produced anything, which fails with
 * `TS2307: Cannot find module`.
 *
 * This script builds the same dependency graph `publish`/`republish` already
 * sort by (see `dependency-sort.mjs`) straight from each package's local
 * `package.json` - no registry lookups, since only the local `@beautinique/*`
 * edges matter for build order - and runs `npm run build` per package in
 * that order. New packages/dependencies need no manual list to maintain:
 * the order is recomputed from what's on disk every run.
 */

/* -------------------------------------------------------------------------- */
/*                                 METADATA                                   */
/* -------------------------------------------------------------------------- */

/**
 * Returns the dependency scope for a package name.
 *
 * @param {string} packageName
 * @returns {'internal' | 'external'}
 */
function getDependencyScope(packageName) {
  return packageName.startsWith(`${PACKAGE_SCOPE}/`)
    ? DEPENDENCY_SCOPES.INTERNAL
    : DEPENDENCY_SCOPES.EXTERNAL;
}

/**
 * Builds the minimal metadata `sortPackagesByDependencies` needs for one
 * workspace package, read straight off its local `package.json`.
 *
 * @param {{ workspaceName: string; directory: string }} pkg
 * @returns {Promise<PublishPackageMetadata>}
 */
async function getBuildMetadata(pkg) {
  const packageJson = await readJson(getPackageJsonPath(pkg.directory));

  const dependencyNames = new Set([
    ...Object.keys(packageJson.dependencies ?? {}),
    ...Object.keys(packageJson.devDependencies ?? {}),
    ...Object.keys(packageJson.peerDependencies ?? {}),
    ...Object.keys(packageJson.optionalDependencies ?? {}),
  ]);

  return {
    npmPackageName: packageJson.name,
    workspaceName: pkg.workspaceName,
    directory: pkg.directory,
    dependencies: [...dependencyNames].map((name) => ({
      name,
      scope: getDependencyScope(name),
    })),
  };
}

/* -------------------------------------------------------------------------- */
/*                                   BUILD                                    */
/* -------------------------------------------------------------------------- */

/**
 * Builds one package via its own `build` script.
 *
 * @param {PublishPackageMetadata} pkg
 * @returns {Promise<void>}
 */
async function buildPackage(pkg) {
  reportInfo(`Building ${pkg.npmPackageName}...`);

  await runInteractiveCommand('npm', ['run', 'build', '--if-present', '-w', pkg.npmPackageName]);
}

/* -------------------------------------------------------------------------- */
/*                                    MAIN                                    */
/* -------------------------------------------------------------------------- */

try {
  const packages = await findPackages();
  const metadata = await Promise.all(packages.map(getBuildMetadata));
  const sortedPackages = sortPackagesByDependencies(metadata);

  for (const pkg of sortedPackages) {
    await buildPackage(pkg);
  }

  reportSuccess(`Built ${sortedPackages.length} packages in dependency order.`);
} catch (error) {
  reportError(error instanceof Error ? error.message : String(error));
  exit(EXIT_CODES.FAILURE);
}
