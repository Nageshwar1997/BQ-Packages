import { writeFile } from 'node:fs/promises';
import path from 'node:path';

import { SHARED_CONFIGS_DIRECTORY } from '../constants.mjs';

/**
 * @import { CreatePackageMetadata } from '../types.mjs'
 */

/* -------------------------------------------------------------------------- */
/*                                   ESLINT                                   */
/* -------------------------------------------------------------------------- */

/**
 * Generates the eslint.config.mjs file.
 *
 * @param {CreatePackageMetadata} metadata
 * @returns {Promise<void>}
 */
export async function generateEslint(metadata) {
  const eslint = `import config from "${SHARED_CONFIGS_DIRECTORY}/eslint/${metadata.config.eslint}";

export default config;
`;

  await writeFile(path.join(metadata.packageDirectory, 'eslint.config.mjs'), eslint, 'utf8');
}
