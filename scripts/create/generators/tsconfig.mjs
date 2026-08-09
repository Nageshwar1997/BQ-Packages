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
  const tsconfig = {
    extends: `${SHARED_CONFIGS_DIRECTORY}/tsconfig/${metadata.config.tsconfig}`,

    /*
     * `exclude` is always resolved relative to the file that declares it
     * (even through `extends`), so it can't live in the shared base config
     * - it must be repeated per package. Keeps `dist` out of `tsc`'s own
     * program (a stale build's declarations would otherwise conflict with
     * freshly-emitted ones) and `tsup.config.ts` out of it (so `tsc
     * --emitDeclarationOnly`'s `--rootDir src` doesn't trip over a file
     * outside `src`) - see `scripts/build-types`.
     */
    exclude: ['dist', 'tsup.config.ts'],
  };

  await writeFile(
    path.join(metadata.packageDirectory, 'tsconfig.json'),
    `${JSON.stringify(tsconfig, null, 2)}\n`,
    'utf8',
  );
}
