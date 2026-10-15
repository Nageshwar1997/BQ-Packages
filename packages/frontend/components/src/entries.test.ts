// @vitest-environment node
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const src = fileURLToPath(new URL('./', import.meta.url));

// An entry that has an `index.ts` is a public path (see `tsup.config.ts`).
const entries = readdirSync(src).filter(
  (name) => statSync(join(src, name)).isDirectory() && existsSync(join(src, name, 'index.ts')),
);

const sourceFiles = (dir: string): string[] =>
  readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);

    if (statSync(path).isDirectory()) return sourceFiles(path);

    return /\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name) ? [path] : [];
  });

// The build gives an import of another entry the package's own path (instead of a copy of it) only
// when it goes through that entry's `index.js` (see `keepEntriesExternal` in `tsup.config.ts`). An
// import of a file of another entry would be bundled: a second copy of that code in this entry.
describe('the entries of the package', () => {
  it.each(entries)('/%s reaches the other entries through their index only', (entry) => {
    const offenders: string[] = [];

    for (const file of sourceFiles(join(src, entry))) {
      const text = readFileSync(file, 'utf8');

      for (const match of text.matchAll(
        /^(import|export)\s+(type\s+)?[^;]*?from\s+'(\.\.\/([^/']+)\/[^']+)';/gms,
      )) {
        const isType = match.at(2);
        const specifier = match.at(3);
        const folder = match.at(4);

        if (isType) continue; // a type is erased: nothing is copied
        if (folder === undefined || !entries.includes(folder) || folder === entry) continue;
        if (specifier === `../${folder}/index.js`) continue;

        offenders.push(`${file.slice(src.length)}: ${specifier ?? ''}`);
      }
    }

    expect(offenders).toEqual([]);
  });

  it('do not import each other in a circle (an entry that imports one that imports it)', () => {
    const imports = new Map<string, Set<string>>();

    for (const entry of entries) {
      const found = new Set<string>();

      for (const file of sourceFiles(join(src, entry))) {
        const text = readFileSync(file, 'utf8');

        for (const match of text.matchAll(
          /^(?:import|export)\s+(?!type\s)[^;]*?from\s+'\.\.\/([^/']+)\/index\.js';/gms,
        )) {
          const folder = match.at(1);

          if (folder !== undefined && entries.includes(folder) && folder !== entry)
            found.add(folder);
        }
      }

      imports.set(entry, found);
    }

    const cycles: string[] = [];

    for (const [entry, dependencies] of imports) {
      for (const dependency of dependencies) {
        if (imports.get(dependency)?.has(entry)) cycles.push(`${entry} <-> ${dependency}`);
      }
    }

    expect(cycles).toEqual([]);
  });
});
