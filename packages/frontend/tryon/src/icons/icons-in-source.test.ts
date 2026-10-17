// @vitest-environment node
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { TRYON_ICON_NAMES } from './try-on-icons.js';

const SRC = fileURLToPath(new URL('../', import.meta.url));
const OWN_FILE = 'icons/try-on-icons.ts';

/** Every non-test source file, as a path inside `src`. */
const sourceFiles = (folder = SRC): string[] =>
  readdirSync(folder).flatMap((name) => {
    const full = `${folder}${name}`;

    return statSync(full).isDirectory() ? sourceFiles(`${full}/`) : [full];
  });

// The names of the sets that are bundled; `bundle-icons` of the maintainer finds the names in the
// source with the same pattern.
const NAME = /['"`]((?:solar|mdi|iconamoon|lucide|icon-park-outline):[a-z0-9-]+)['"`]/g;

const namesInSource = () => {
  const names = new Set<string>();

  for (const file of sourceFiles()) {
    const path = file.slice(SRC.length);

    if (!/\.tsx?$/.test(path) || /\.test\.tsx?$/.test(path) || path === OWN_FILE) continue;

    for (const [, name] of readFileSync(file, 'utf8').matchAll(NAME)) {
      if (name !== undefined) names.add(name);
    }
  }

  return [...names].sort();
};

describe('the icons the source names', () => {
  const bundled = [...TRYON_ICON_NAMES].sort();
  const inSource = namesInSource();
  const bundledFile = readFileSync(`${SRC}icons/try-on-icons.ts`, 'utf8');

  it('are all bundled: none is missing (it would be empty offline)', () => {
    expect(inSource.filter((name) => !bundled.includes(name))).toEqual([]);
  });

  it('are all there is, except the parent of an alias (Iconify refuses a set with an alias but no parent)', () => {
    const extra = bundled.filter((name) => !inSource.includes(name));

    for (const name of extra) {
      const icon = name.slice(name.indexOf(':') + 1);

      expect(bundledFile, name).toContain(`parent: '${icon}'`);
    }
  });
});
