// @vitest-environment node
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { IN_ROOT } from './test-utils/entries.js';

const dist = new URL('../dist/', import.meta.url);
const isBuilt = existsSync(new URL('index.js', dist)) && existsSync(new URL('index.cjs', dist));

const packageJson = JSON.parse(
  readFileSync(new URL('../package.json', import.meta.url), 'utf8'),
) as { exports: Record<string, string | Record<string, string>> };

// Every path of the package other than the root: `exports` of package.json is the list.
const PATHS = Object.entries(packageJson.exports)
  .filter(([path, target]) => path !== '.' && typeof target === 'object')
  .map(([path]) => path.slice(2));

interface IReport {
  /** The root has exactly the names of its paths together. */
  sameNames: boolean;
  /** Names whose value in the root is not the very same value as in its paths. */
  different: string[];
  /** The names each path gives, once built. */
  names: Record<string, string[]>;
  inRoot: string[];
}

// A component can import the css that is its own (`import '@beautinique/frontend-styles/teddy.css'`).
// A bundler handles that; plain Node does not know the extension, so it is told to load an empty file.
const SKIP_CSS = {
  esm: `require('node:module').register('data:text/javascript,' + encodeURIComponent(
    'export async function load(url, context, next) { if (url.endsWith(".css")) return { format: "module", source: "", shortCircuit: true }; return next(url, context); }'
  ));`,
  cjs: `require.extensions['.css'] = () => undefined;`,
} as const;

// Plain Node loads the files, as an app's server or bundler does: vitest has its own module loader
// that can load one file twice, which would say the root and /toast are two copies when they are not.
const script = (kind: 'esm' | 'cjs') => `
  ${SKIP_CSS[kind]}
  const IN_ROOT = ${JSON.stringify(IN_ROOT)};
  const PATHS = ${JSON.stringify(PATHS)};
  const ext = '${kind === 'esm' ? 'js' : 'cjs'}';
  const load = (name) => ${
    kind === 'esm'
      ? `import(require('node:url').pathToFileURL(process.env.DIST + name).href)`
      : `Promise.resolve(require(process.env.DIST + name))`
  };
  const main = async () => {
    const root = await load('index.' + ext);
    const loaded = {};
    for (const path of PATHS) loaded[path] = await load(path + '/index.' + ext);
    const source = Object.assign({}, ...IN_ROOT.map((path) => loaded[path]));
    const different = Object.keys(root).filter((name) => root[name] !== source[name]);
    const sameNames = Object.keys(root).sort().join() === Object.keys(source).sort().join();
    const names = Object.fromEntries(PATHS.map((path) => [path, Object.keys(loaded[path]).sort()]));
    console.log(JSON.stringify({ sameNames, different, names, inRoot: Object.keys(root) }));
  };
  main();
`;

const report = (kind: 'esm' | 'cjs'): IReport =>
  JSON.parse(
    execFileSync(process.execPath, ['-e', script(kind)], {
      encoding: 'utf8',
      cwd: fileURLToPath(new URL('../', import.meta.url)),
      env: { ...process.env, DIST: fileURLToPath(dist) },
    }),
  ) as IReport;

// These test the files that are published (`dist`), so they run only after `npm run build`. A
// bundler that copies the entries into the root file (it did, before the build config kept them
// apart) makes a root that is a second copy of `/ui` and `/toast`: twice the code in an app, and
// the sources cannot show that.
describe.skipIf(!isBuilt)('the built files', () => {
  it.each(['esm', 'cjs'] as const)(
    '(%s) give the root the very same values as its paths, and the others a path of their own',
    (kind) => {
      const built = report(kind);
      const own = PATHS.filter((path) => !IN_ROOT.includes(path));

      expect(built.sameNames).toBe(true);
      expect(built.different).toEqual([]);
      expect(Object.keys(built.names).sort()).toEqual([...PATHS].sort());

      for (const path of own) {
        for (const name of built.names[path] ?? [])
          expect(built.inRoot, `${path}: ${name}`).not.toContain(name);
      }
    },
  );

  it('keep the root a few lines long: it only points at its paths', () => {
    const root = readFileSync(new URL('index.js', dist), 'utf8');

    for (const path of IN_ROOT) {
      expect(root).toContain(`from '@beautinique/frontend-components/${path}'`);
    }
    expect(root.length).toBeLessThan(1500);
  });

  // A path that uses another one (a modal uses the scrolling box) imports it by its own path, so an
  // app that uses both has one copy of it. A copy would show as the code of that component in both.
  it('hold no copy of the code of another path', () => {
    const { names } = report('esm');
    const copies: string[] = [];

    for (const path of PATHS) {
      const text = readFileSync(new URL(`${path}/index.js`, dist), 'utf8')
        .split('\n')
        .filter((line) => !line.startsWith('import ') && !line.startsWith('export '))
        .join('\n');

      for (const other of PATHS.filter((candidate) => candidate !== path)) {
        for (const name of names[other] ?? []) {
          if (new RegExp(`(?:var|let|const|function)\\s+${name}\\b`).test(text)) {
            copies.push(`/${path} has its own ${name} (of /${other})`);
          }
        }
      }
    }

    expect(copies).toEqual([]);
  });

  // "exports" of package.json is what an app resolves: a path that points at a file the build did
  // not make is a broken import for every app that uses it.
  it('have a file for every path that "exports" of package.json promises', () => {
    const missing: string[] = [];

    for (const [path, target] of Object.entries(packageJson.exports)) {
      const files = typeof target === 'string' ? [target] : Object.values(target);

      for (const file of files) {
        if (!existsSync(new URL(`../${file}`, import.meta.url))) missing.push(`${path} -> ${file}`);
      }
    }

    expect(missing).toEqual([]);
  });

  it('have the types for the CJS file of every path too', () => {
    const missing = ['index', ...PATHS.map((path) => `${path}/index`)].filter(
      (name) => !existsSync(new URL(`${name}.d.cts`, dist)),
    );

    expect(missing).toEqual([]);
  });
});
