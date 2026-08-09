import { constants } from 'node:fs';
import { access, mkdir } from 'node:fs/promises';

/* -------------------------------------------------------------------------- */
/*                                   PACKAGE                                  */
/* -------------------------------------------------------------------------- */

/**
 * Checks whether a package already exists.
 *
 * @param {string} pkgDirPath
 * @returns {Promise<boolean>}
 */
export async function checkPackageExists(pkgDirPath) {
  try {
    await access(pkgDirPath, constants.F_OK);

    return true;
  } catch {
    return false;
  }
}

/**
 * Creates the package directory.
 *
 * @param {string} pkgDirPath
 * @returns {Promise<void>}
 */
export async function createPackageDirectory(pkgDirPath) {
  await mkdir(pkgDirPath, { recursive: true });
}
