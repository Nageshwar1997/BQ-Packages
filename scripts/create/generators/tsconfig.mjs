import { writeFile } from 'node:fs/promises';
import path from 'node:path';

import { SHARED_CONFIGS_DIRECTORY } from '../constants.mjs';

/**
 * @import { CreatePackageMetadata } from '../types.mjs'
 */

/* -------------------------------------------------------------------------- */
/*                                 TSCONFIG                                   */
/* -------------------------------------------------------------------------- */

/**
 * Generates the tsconfig.json file.
 *
 * @param {CreatePackageMetadata} metadata
 * @returns {Promise<void>}
 */
export async function generateTsconfig(metadata) {
  const tsconfig = { extends: `${SHARED_CONFIGS_DIRECTORY}/tsconfig/${metadata.config.tsconfig}` };

  await writeFile(
    path.join(metadata.packageDirectory, 'tsconfig.json'),
    `${JSON.stringify(tsconfig, null, 2)}\n`,
    'utf8',
  );
}
