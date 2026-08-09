import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { reportError, reportInfo, reportSuccess } from '../common/reporter.mjs';
import { EXIT_CODES } from '../common/constants.mjs';
import { exit, pathExists, runInteractiveCommand } from '../common/utils.mjs';

/**
 * Generates this package's `.d.ts` declarations via `tsc` (not `tsup`),
 * then duplicates them to `.d.cts` for CJS consumers.
 *
 * Run from the package's own directory (as the second half of its `build`
 * script, after `tsup`) - `tsup`'s bundled declaration step uses an
 * isolated, worker-threaded TypeScript program that has proven flaky on
 * this repo's TypeScript version (fails intermittently, succeeds on retry,
 * same source), while plain `tsc --emitDeclarationOnly` runs the same
 * declaration emit through the same battle-tested path as `npm run
 * typecheck`, which has never flaked. `tsup` still owns the JS/CJS bundles
 * (`dts: false` in the shared tsup config) - only declaration emission
 * moves here.
 */

const PACKAGE_DIRECTORY = process.cwd();
const DIST_DIRECTORY = path.join(PACKAGE_DIRECTORY, 'dist');

/* -------------------------------------------------------------------------- */
/*                                DECLARATIONS                                */
/* -------------------------------------------------------------------------- */

/**
 * Runs `tsc --emitDeclarationOnly` against this package's own `tsconfig.json`.
 *
 * @returns {Promise<void>}
 */
async function emitDeclarations() {
  reportInfo('Generating declaration files (tsc)...');

  await runInteractiveCommand(
    'tsc',
    ['-p', 'tsconfig.json', '--emitDeclarationOnly', '--outDir', 'dist', '--rootDir', 'src'],
    { cwd: PACKAGE_DIRECTORY },
  );
}

/* -------------------------------------------------------------------------- */
/*                                CJS MIRRORING                               */
/* -------------------------------------------------------------------------- */

/**
 * Recursively duplicates every `.d.ts`/`.d.ts.map` under `directory` to a
 * `.d.cts`/`.d.cts.map` sibling, so `require()` consumers resolve the same
 * declarations `import` consumers do (Node's `NodeNext` module resolution
 * looks for the `.d.cts` extension specifically from a `.cjs`/`require()`
 * entry point, and package.json's `exports.require.types` here points at it).
 *
 * @param {string} directory
 * @returns {Promise<void>}
 */
async function duplicateForCjs(directory) {
  const entries = await readdir(directory, { withFileTypes: true });

  await Promise.all(
    entries.map(async (entry) => {
      const entryPath = path.join(directory, entry.name);

      if (entry.isDirectory()) {
        await duplicateForCjs(entryPath);
        return;
      }

      if (entry.name.endsWith('.d.ts')) {
        const content = await readFile(entryPath, 'utf8');
        const cjsContent = content.replace(
          /\/\/# sourceMappingURL=(.+)\.d\.ts\.map/,
          '//# sourceMappingURL=$1.d.cts.map',
        );

        await writeFile(entryPath.replace(/\.d\.ts$/, '.d.cts'), cjsContent, 'utf8');
        return;
      }

      if (entry.name.endsWith('.d.ts.map')) {
        const map = JSON.parse(await readFile(entryPath, 'utf8'));

        if (typeof map.file === 'string') {
          map.file = map.file.replace(/\.d\.ts$/, '.d.cts');
        }

        await writeFile(entryPath.replace(/\.d\.ts\.map$/, '.d.cts.map'), JSON.stringify(map), 'utf8');
      }
    }),
  );
}

/* -------------------------------------------------------------------------- */
/*                                    MAIN                                    */
/* -------------------------------------------------------------------------- */

try {
  await emitDeclarations();

  if (!(await pathExists(DIST_DIRECTORY))) {
    throw new Error(`"dist" was not created at ${DIST_DIRECTORY}.`);
  }

  await duplicateForCjs(DIST_DIRECTORY);

  reportSuccess('Declaration files generated.');
  exit(EXIT_CODES.SUCCESS);
} catch (error) {
  reportError(error instanceof Error ? error.message : String(error));
  exit(EXIT_CODES.FAILURE);
}
