// @vitest-environment node
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

// Quill needs a document to be loaded, so the editor is read as text where a test has no DOM.
const packageDir = new URL('../', import.meta.url);
const srcDir = new URL('./', import.meta.url);
const packageJson = JSON.parse(readFileSync(new URL('package.json', packageDir), 'utf8')) as {
  exports: Record<string, unknown>;
  peerDependencies: Record<string, string>;
  peerDependenciesMeta: Record<string, { optional?: boolean }>;
};

// What the package gives to the apps, per import path. Nothing else may be reachable: an internal
// helper that leaks becomes a promise to keep it.
const API: Record<string, string[]> = {
  '.': ['QuillContent', 'sanitizeQuillHtml'],
  editor: [
    'DEFAULT_ALLOWED_IMAGE_HOSTS',
    'DEFAULT_QUILL_LINK_ID',
    'DEFAULT_QUILL_PLACEHOLDER',
    'DEFAULT_QUILL_TOOLBAR',
    'QuillEditor',
    'QuillUploadCountError',
    'describeQuillEditorError',
    'getQuillContent',
    'getQuillImageFiles',
    'getQuillImagesInText',
    'processQuillContent',
  ],
};

/** The names a file exports with `export { ... }` / `export type { ... }`, values only. */
const valueNamesOf = (file: URL): string[] =>
  [...readFileSync(file, 'utf8').matchAll(/export\s+(type\s+)?\{([^}]*)\}/g)]
    .filter(([, isType]) => !isType)
    .flatMap(([, , body]) =>
      body
        .split(',')
        .map((item) => item.trim())
        .filter((item) => item !== '' && !item.startsWith('type '))
        .map((item) => item.split(/\s+as\s+/).at(-1) ?? item),
    );

describe('the public API of the package', () => {
  it('has a path for every folder that has an index, and a folder for every path', () => {
    const folders = readdirSync(fileURLToPath(srcDir), { withFileTypes: true })
      .filter(
        (entry) =>
          entry.isDirectory() &&
          existsSync(fileURLToPath(new URL(`${entry.name}/index.ts`, srcDir))),
      )
      .map((entry) => entry.name);
    const paths = Object.entries(packageJson.exports)
      .filter(([path, target]) => path !== '.' && typeof target === 'object')
      .map(([path]) => path.slice(2));

    expect(folders.sort()).toEqual(paths.sort());
    expect(
      Object.keys(API)
        .filter((path) => path !== '.')
        .sort(),
    ).toEqual(paths.sort());
  });

  it('exports exactly these values from the root (the viewer)', () => {
    expect(valueNamesOf(new URL('index.ts', srcDir)).sort()).toEqual([...API['.']].sort());
  });

  it('exports exactly these values from /editor', () => {
    expect(valueNamesOf(new URL('editor/index.ts', srcDir)).sort()).toEqual([...API.editor].sort());
  });
});

/** The files of a folder of `src` that are the package and not a test of it. */
const sourceFilesOf = (directory: URL): URL[] =>
  readdirSync(fileURLToPath(directory)).flatMap((name) => {
    const url = new URL(name, directory);

    if (statSync(fileURLToPath(url)).isDirectory()) {
      return sourceFilesOf(new URL(`${name}/`, directory));
    }

    return /\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name) ? [url] : [];
  });

// The reason the package has two paths: an app that only shows saved content must not load the editor,
// and does not have `quill` installed (it is an optional peer dependency).
describe('the viewer (the root)', () => {
  const viewerFiles = [new URL('index.ts', srcDir), ...sourceFilesOf(new URL('viewer/', srcDir))];

  it('has the files to look at', () => {
    expect(viewerFiles.length).toBeGreaterThanOrEqual(3);
  });

  it.each(viewerFiles.map((file) => [file.pathname.split('/src/')[1] ?? '', file] as const))(
    '%s does not import quill or the editor',
    (_name, file) => {
      const text = readFileSync(file, 'utf8');

      expect(text).not.toMatch(/from ['"]quill/);
      expect(text).not.toMatch(/import\(['"]quill/);
      expect(text).not.toMatch(/from ['"][./]*\/?editor\//);
    },
  );

  it('lists quill as an optional peer dependency', () => {
    expect(packageJson.peerDependencies.quill).toBeDefined();
    expect(packageJson.peerDependenciesMeta.quill.optional).toBe(true);
  });
});
