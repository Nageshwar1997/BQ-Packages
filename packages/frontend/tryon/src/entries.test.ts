// @vitest-environment node
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const PACKAGE_URL = new URL('../package.json', import.meta.url);
const SRC_URL = new URL('./', import.meta.url);

// The list of tsup is read as text: importing the config would make it part of the type-checked program
// (the lint of the package keeps it out of it).
const tsupConfig = readFileSync(new URL('../tsup.config.ts', import.meta.url), 'utf8');
const ENTRY_DIRS = [
  ...(/ENTRY_DIRS = \[([^\]]*)\]/.exec(tsupConfig)?.[1] ?? '').matchAll(/'([^']+)'/g),
].map(([, name]) => name ?? '');

const packageJson = JSON.parse(readFileSync(PACKAGE_URL, 'utf8')) as {
  exports: Record<string, string | Record<string, string>>;
};

/** The import paths of the package other than the root and the files: the entries. */
const exportedEntries = Object.entries(packageJson.exports)
  .filter(([path, target]) => path !== '.' && typeof target === 'object')
  .map(([path]) => path.slice(2))
  .sort();

/**
 * The folders of `src` that have an `index.ts` and are not an entry: it is the barrel of a part of the
 * modal's file. A new folder with an `index.ts` has to be put here, or made an entry, on purpose.
 */
const INTERNAL_FOLDERS = ['types', 'utils'];

/** The folders of `src` with an `index.ts` of their own. */
const entryFolders = readdirSync(SRC_URL)
  .filter(
    (name) =>
      statSync(new URL(`${name}/`, SRC_URL), { throwIfNoEntry: false })?.isDirectory() === true &&
      existsSync(new URL(`${name}/index.ts`, SRC_URL)),
  )
  .sort();

describe('the entries of the package', () => {
  it('are the same in tsup, in the "exports" of package.json and in the folders of src with an index.ts', () => {
    expect([...ENTRY_DIRS].sort()).toEqual(exportedEntries);
    expect(entryFolders.filter((folder) => !INTERNAL_FOLDERS.includes(folder))).toEqual(
      exportedEntries,
    );
  });

  it('each give an import, a require and the types, in files that the build makes', () => {
    for (const path of ['.', ...exportedEntries.map((entry) => `./${entry}`)]) {
      const target = packageJson.exports[path === '.' ? '.' : path] as Record<string, string>;
      const base = path === '.' ? 'index' : `${path.slice(2)}/index`;

      expect(target.import, path).toBe(`./dist/${base}.js`);
      expect(target.require, path).toBe(`./dist/${base}.cjs`);
      expect(target.types, path).toBe(`./dist/${base}.d.ts`);
    }
  });

  it('give the file that tells Tailwind where the class names are, and the package.json', () => {
    expect(packageJson.exports['./source.css']).toBe('./source.css');
    expect(packageJson.exports['./package.json']).toBe('./package.json');
  });
});

/*
 * The constants are for a form of an app (the category and the subcategory of a product): it must not
 * cost the app MediaPipe or React. The source of that entry may only import its own files, the types
 * (erased by the compiler) and the packages of data.
 */
describe('the constants entry', () => {
  const folder = fileURLToPath(new URL('constants/', SRC_URL));
  const files = readdirSync(folder).filter(
    (name) => name.endsWith('.ts') && !name.endsWith('.test.ts'),
  );

  const importsOf = (file: string) =>
    [
      ...readFileSync(`${folder}${file}`, 'utf8').matchAll(
        /^import\s+(type\s+)?[^;]*?from\s+'([^']+)';/gms,
      ),
    ].map(([, type, from]) => ({ isType: type !== undefined, from: from ?? '' }));

  it('has files to look at', () => {
    expect(files).toEqual(
      expect.arrayContaining([
        'assets.ts',
        'eye.ts',
        'face.ts',
        'hair.ts',
        'index.ts',
        'lip.ts',
        'nail.ts',
      ]),
    );
  });

  it.each(files)(
    '%s imports nothing that runs but its own files and the packages of data',
    (file) => {
      const runtime = importsOf(file)
        .filter(({ isType }) => !isType)
        .map(({ from }) => from);

      for (const from of runtime) {
        expect(
          from.startsWith('./') ||
            from === '@beautinique/frontend-constants' ||
            from === '@beautinique/frontend-types',
          `${file} imports ${from}`,
        ).toBe(true);
      }
    },
  );
});

describe('source.css', () => {
  // Without this line Tailwind never sees the class names inside the package and the try-on comes out
  // unstyled, so it is checked here.
  it('tells Tailwind to look for class names in dist', () => {
    const sourceCss = readFileSync(new URL('../source.css', import.meta.url), 'utf8');

    expect(sourceCss).toMatch(/^@source '\.\/dist';$/m);
  });
});
