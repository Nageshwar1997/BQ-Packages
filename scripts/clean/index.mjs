import { readdir, rm } from 'node:fs/promises';
import { join } from 'node:path';

import { BUILD_ARTIFACTS, EXIT_CODES } from '../common/constants.mjs';
import { ROOT_DIRECTORY } from '../common/paths.mjs';
import { reportInfo, reportSuccess } from '../common/reporter.mjs';

async function clean(directory) {
  reportInfo(`Cleaning ${directory}`);
  const entries = await readdir(directory, { withFileTypes: true });

  await Promise.all(
    entries.map(async (entry) => {
      const fullPath = join(directory, entry.name);

      if (BUILD_ARTIFACTS.has(entry.name)) {
        await rm(fullPath, { recursive: true, force: true });

        return;
      }

      if (entry.isDirectory()) {
        await clean(fullPath);
      }
    }),
  );
}

await clean(ROOT_DIRECTORY);

reportSuccess('✨ Builds cleaned.');

process.exit(EXIT_CODES.SUCCESS);
