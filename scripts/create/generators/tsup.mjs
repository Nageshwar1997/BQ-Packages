import { writeFile } from 'node:fs/promises';
import path from 'node:path';

import { SHARED_CONFIGS_DIRECTORY } from '../constants.mjs';

/**
 * @import { CreatePackageMetadata } from '../types.mjs'
 */

/* -------------------------------------------------------------------------- */
/*                                    TSUP                                    */
/* -------------------------------------------------------------------------- */

/**
 * Generates the tsup.config.ts file.
 *
 * @param {CreatePackageMetadata} metadata
 * @returns {Promise<void>}
 */
export async function generateTsup(metadata) {
  const configName = path.parse(metadata.config.tsup).name;

  const tsup = `import config from "${SHARED_CONFIGS_DIRECTORY}/tsup/${configName}.js";

export default config;
`;

  await writeFile(path.join(metadata.packageDirectory, 'tsup.config.ts'), tsup, 'utf8');
}
