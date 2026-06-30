import { readdir } from 'node:fs/promises';
import path from 'node:path';

import { PACKAGES_DIRECTORY } from '../common/paths.mjs';

/**
 * @import { WorkspacePackage } from '../common/types.mjs'
 */

/* -------------------------------------------------------------------------- */
/*                               FIND PACKAGES                                */
/* -------------------------------------------------------------------------- */

/**
 * Finds all workspace packages.
 *
 * @returns {Promise<WorkspacePackage[]>}
 */
export async function findPackages() {
  /** @type {WorkspacePackage[]} */
  const packages = [];

  const packageTypes = await readdir(PACKAGES_DIRECTORY, {
    withFileTypes: true,
  });

  for (const packageType of packageTypes) {
    if (!packageType.isDirectory()) continue;

    const typeDirectory = path.join(PACKAGES_DIRECTORY, packageType.name);

    const packageDirectories = await readdir(typeDirectory, {
      withFileTypes: true,
    });

    for (const packageDirectory of packageDirectories) {
      if (!packageDirectory.isDirectory()) continue;

      packages.push({
        packageType: packageType.name,
        workspaceName: packageDirectory.name,
        directory: path.join(typeDirectory, packageDirectory.name),
      });
    }
  }

  return packages.sort((a, b) => {
    const typeComparison = a.packageType.localeCompare(b.packageType);

    if (typeComparison !== 0) {
      return typeComparison;
    }

    return a.workspaceName.localeCompare(b.workspaceName);
  });
}

/* -------------------------------------------------------------------------- */
/*                                FIND PACKAGE                                */
/* -------------------------------------------------------------------------- */

/**
 * Finds a workspace package.
 *
 * @param {string} workspaceName
 * @returns {Promise<WorkspacePackage | null>}
 */
export async function findPackage(workspaceName) {
  const packages = await findPackages();

  return packages.find((pkg) => pkg.workspaceName === workspaceName) ?? null;
}
