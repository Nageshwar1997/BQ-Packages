// @vitest-environment node
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const dist = new URL('../dist/', import.meta.url);
const isBuilt = existsSync(new URL('index.js', dist)) && existsSync(new URL('index.cjs', dist));

const packageJson = JSON.parse(
  readFileSync(new URL('../package.json', import.meta.url), 'utf8'),
) as { exports: Record<string, string | Record<string, string>> };

const read = (file: string) => readFileSync(new URL(file, dist), 'utf8');

/** What plain Node says after it loads the built root, as an app's server or bundler would. */
const loadRoot = (kind: 'esm' | 'cjs') =>
  JSON.parse(
    execFileSync(
      process.execPath,
      [
        '-e',
        `
        const load = ${
          kind === 'esm'
            ? `() => import(require('node:url').pathToFileURL(process.env.DIST + 'index.js').href)`
            : `() => Promise.resolve(require(process.env.DIST + 'index.cjs'))`
        };
        load().then((root) => console.log(JSON.stringify({
          names: Object.keys(root).sort(),
          // there is no window in Node: cleaning is not possible, and must not hand the HTML back
          cleaned: root.sanitizeQuillHtml('<img src=x onerror=alert(1)>'),
        })));
      `,
      ],
      {
        encoding: 'utf8',
        cwd: fileURLToPath(new URL('../', import.meta.url)),
        env: { ...process.env, DIST: fileURLToPath(dist) },
      },
    ),
  ) as { names: string[]; cleaned: string };

// These test the files that are published (`dist`), so they run only after `npm run build`. The sources
// cannot show that the root of the package is free of Quill once it is built.
describe.skipIf(!isBuilt)('the built files', () => {
  it.each(['esm', 'cjs'] as const)(
    '(%s) the root loads in plain Node, with no quill installed',
    (kind) => {
      const { names, cleaned } = loadRoot(kind);

      expect(names).toEqual(['QuillContent', 'sanitizeQuillHtml']);
      expect(cleaned).toBe('');
    },
  );

  it('the files of the root do not import quill', () => {
    for (const file of ['index.js', 'index.cjs']) {
      expect(read(file), file).not.toMatch(/['"]quill(\/[^'"]*)?['"]/);
    }
  });

  it('the declarations of the root do not need the types of quill', () => {
    const files = [
      'index.d.ts',
      'index.d.cts',
      ...readdirSync(new URL('viewer/', dist)).map((name) => `viewer/${name}`),
    ];

    for (const file of files.filter((name) => /\.d\.c?ts$/.test(name))) {
      expect(read(file), file).not.toMatch(/['"]quill/);
    }
  });

  it('the files of the editor import quill, and none of them imports the root of the package', () => {
    expect(read('editor/index.js')).toMatch(/from 'quill'/);
    expect(read('editor/index.cjs')).toMatch(/require\(['"]quill['"]\)/);

    for (const file of ['editor/index.js', 'editor/index.cjs']) {
      expect(read(file), file).not.toContain('@beautinique/frontend-quill');
    }
  });

  it('keeps DOMPurify out of the files: it is a dependency, an app has one copy of it', () => {
    for (const file of ['index.js', 'editor/index.js']) {
      expect(read(file), file).toMatch(/from 'dompurify'/);
      expect(read(file), file).not.toContain('purify.js');
      expect(read(file).length, file).toBeLessThan(40_000);
    }
  });

  // "exports" of package.json is what an app resolves: a path that points at a file the build did
  // not make is a broken import for every app that uses it.
  it('has a file for every path that "exports" of package.json promises', () => {
    const missing: string[] = [];

    for (const [path, target] of Object.entries(packageJson.exports)) {
      const files = typeof target === 'string' ? [target] : Object.values(target);

      for (const file of files) {
        if (!existsSync(new URL(`../${file}`, import.meta.url))) {
          missing.push(`${path} -> ${file}`);
        }
      }
    }

    expect(missing).toEqual([]);
  });

  it('has the types for the CJS file of every path too', () => {
    const missing = ['index', 'editor/index'].filter(
      (name) => !existsSync(new URL(`${name}.d.cts`, dist)),
    );

    expect(missing).toEqual([]);
  });
});
