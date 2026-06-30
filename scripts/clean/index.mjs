import { readdir, rm } from 'node:fs/promises';
import { join } from 'node:path';

import { BUILD_ARTIFACTS, EXIT_CODES } from '../common/constants.mjs';

async function clean(directory) {
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

await clean(process.cwd());

console.log('✨ Builds cleaned.');

process.exit(EXIT_CODES.SUCCESS);
