// @vitest-environment node
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const dist = new URL('../dist/', import.meta.url);
const isBuilt = existsSync(new URL('index.js', dist)) && existsSync(new URL('index.cjs', dist));

// The paths the root only re-exports, and the paths of one component each (not in the root).
const IN_ROOT = ['ui', 'layout', 'theme', 'toast'];
const OWN_PATH = {
  auth: ['AuthBottomInstructions'],
  'linear-gradient': ['LinearGradient'],
  resend: ['Resend'],
  stepper: ['Stepper'],
};

interface IReport {
  /** The root has exactly the names of its paths together. */
  sameNames: boolean;
  /** Names whose value in the root is not the very same value as in its paths. */
  different: string[];
  /** The names each path of one component gives, once built; none of them is in the root. */
  own: Record<string, string[]>;
  inRoot: string[];
}

// Plain Node loads the files, as an app's server or bundler does: vitest has its own module loader
// that can load one file twice, which would say the root and /toast are two copies when they are not.
const script = (kind: 'esm' | 'cjs') => `
  const IN_ROOT = ${JSON.stringify(IN_ROOT)};
  const OWN = ${JSON.stringify(Object.keys(OWN_PATH))};
  const ext = '${kind === 'esm' ? 'js' : 'cjs'}';
  const load = (name) => ${
    kind === 'esm'
      ? `import(require('node:url').pathToFileURL(process.env.DIST + name).href)`
      : `Promise.resolve(require(process.env.DIST + name))`
  };
  const main = async () => {
    const root = await load('index.' + ext);
    const paths = await Promise.all(IN_ROOT.map((path) => load(path + '/index.' + ext)));
    const source = Object.assign({}, ...paths);
    const different = Object.keys(root).filter((name) => root[name] !== source[name]);
    const sameNames = Object.keys(root).sort().join() === Object.keys(source).sort().join();
    const own = {};
    for (const path of OWN) own[path] = Object.keys(await load(path + '/index.' + ext)).sort();
    console.log(JSON.stringify({ sameNames, different, own, inRoot: Object.keys(root) }));
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

      expect(built.sameNames).toBe(true);
      expect(built.different).toEqual([]);
      expect(built.own).toEqual(
        Object.fromEntries(Object.entries(OWN_PATH).map(([path, names]) => [path, [...names]])),
      );
      for (const names of Object.values(OWN_PATH)) {
        for (const name of names) expect(built.inRoot, name).not.toContain(name);
      }
    },
  );

  it('keep the root a few lines long: it only points at its paths', () => {
    const root = readFileSync(new URL('index.js', dist), 'utf8');

    for (const path of IN_ROOT) {
      expect(root).toContain(`from '@beautinique/frontend-components/${path}'`);
    }
    expect(root.length).toBeLessThan(1000);
  });

  // "exports" of package.json is what an app resolves: a path that points at a file the build did
  // not make is a broken import for every app that uses it.
  it('have a file for every path that "exports" of package.json promises', () => {
    const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')) as {
      exports: Record<string, string | Record<string, string>>;
    };
    const missing: string[] = [];

    for (const [path, target] of Object.entries(pkg.exports)) {
      const files = typeof target === 'string' ? [target] : Object.values(target);

      for (const file of files) {
        if (!existsSync(new URL(`../${file}`, import.meta.url))) missing.push(`${path} -> ${file}`);
      }
    }

    expect(missing).toEqual([]);
  });

  it('have the types for the CJS file of every path too', () => {
    const missing = ['index', ...IN_ROOT.map((p) => `${p}/index`)]
      .concat(Object.keys(OWN_PATH).map((p) => `${p}/index`))
      .filter((name) => !existsSync(new URL(`${name}.d.cts`, dist)));

    expect(missing).toEqual([]);
  });
});
