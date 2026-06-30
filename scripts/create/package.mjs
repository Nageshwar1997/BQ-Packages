import { constants } from 'node:fs';
import { access, mkdir } from 'node:fs/promises';

/* -------------------------------------------------------------------------- */
/*                                   PACKAGE                                  */
/* -------------------------------------------------------------------------- */

/**
 * Checks whether a package already exists.
 *
 * @param {object} metadata
 * @returns {Promise<boolean>}
 */
export async function checkPackageExists(metadata) {
  try {
    await access(metadata.packageDirectory, constants.F_OK);

    return true;
  } catch {
    return false;
  }
}

/**
 * Creates the package directory.
 *
 * @param {object} metadata
 * @returns {Promise<void>}
 */
export async function createPackageDirectory(metadata) {
  await mkdir(metadata.packageDirectory, { recursive: true });
}
