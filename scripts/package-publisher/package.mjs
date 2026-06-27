import { readdir } from 'node:fs/promises';
import path from 'node:path';
import { PACKAGES_DIRECTORY } from './paths.mjs';

/* -------------------------------------------------------------------------- */
/*                               FIND PACKAGES                                */
/* -------------------------------------------------------------------------- */

/**
 * Finds all workspace packages.
 *
 * @returns {Promise<
 *   {
 *     type: string;
 *     name: string;
 *     directory: string;
 *   }[]
 * >}
 */
export async function findPackages() {
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
        type: packageType.name,
        name: packageDirectory.name,
        directory: path.join(typeDirectory, packageDirectory.name),
      });
    }
  }

  return packages;
}

/* -------------------------------------------------------------------------- */
/*                                FIND PACKAGE                                */
/* -------------------------------------------------------------------------- */

/**
 * Finds a workspace package.
 *
 * @param {string} name
 * @returns {Promise<{
 *   type: string;
 *   name: string;
 *   directory: string;
 * } | null>}
 */
export async function findPackage(name) {
  const packages = await findPackages();

  return packages.find((pkg) => pkg.name === name) ?? null;
}
