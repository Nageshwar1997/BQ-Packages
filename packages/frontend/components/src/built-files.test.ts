// @vitest-environment node
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const dist = new URL('../dist/', import.meta.url);
const isBuilt = existsSync(new URL('index.js', dist)) && existsSync(new URL('index.cjs', dist));

interface IReport {
  /** The root has exactly the names of /ui and /toast together. */
  sameNames: boolean;
  /** Names whose value in the root is not the very same value as in /ui or /toast. */
  different: string[];
  /** Toasts in the store of /toast after one was shown through the root. */
  shown: number;
}

// Plain Node loads the files, as an app's server or bundler does: vitest has its own module loader
// that can load one file twice, which would say the root and /toast are two copies when they are not.
const ESM = `
  import { pathToFileURL } from 'node:url';
  const load = (file) => import(pathToFileURL(process.env.DIST + file).href);
  const [root, ui, toast] = await Promise.all([load('index.js'), load('ui/index.js'), load('toast/index.js')]);
  const source = { ...ui, ...toast };
  const different = Object.keys(root).filter((name) => root[name] !== source[name]);
  const sameNames = Object.keys(root).sort().join() === Object.keys(source).sort().join();
  root.toaster.default({ title: 'From the root' });
  console.log(JSON.stringify({ sameNames, different, shown: toast.useToastStore.getState().toasts.length }));
`;

const CJS = `
  const load = (file) => require(process.env.DIST + file);
  const [root, ui, toast] = [load('index.cjs'), load('ui/index.cjs'), load('toast/index.cjs')];
  const source = { ...ui, ...toast };
  const different = Object.keys(root).filter((name) => root[name] !== source[name]);
  const sameNames = Object.keys(root).sort().join() === Object.keys(source).sort().join();
  root.toaster.default({ title: 'From the root' });
  console.log(JSON.stringify({ sameNames, different, shown: toast.useToastStore.getState().toasts.length }));
`;

const report = (args: string[], source: string): IReport =>
  JSON.parse(
    execFileSync(process.execPath, [...args, '-e', source], {
      encoding: 'utf8',
      cwd: fileURLToPath(new URL('../', import.meta.url)),
      env: { ...process.env, DIST: fileURLToPath(dist) },
    }),
  ) as IReport;

// These test the files that are published (`dist`), so they run only after `npm run build`. A
// bundler that copies the entries into the root file (it did, before the build config kept them
// apart) gives the root a toast store of its own, and the sources cannot show that.
describe.skipIf(!isBuilt)('the built files', () => {
  it('(ESM) give the root the very same values as /ui and /toast: one toast store, not two', () => {
    expect(report(['--input-type=module'], ESM)).toEqual({
      sameNames: true,
      different: [],
      shown: 1,
    });
  });

  it('(CJS) give the root the very same values as /ui and /toast: one toast store, not two', () => {
    expect(report([], CJS)).toEqual({ sameNames: true, different: [], shown: 1 });
  });

  it('keep the root a few lines long: it only points at /ui and /toast', () => {
    const root = readFileSync(new URL('index.js', dist), 'utf8');

    expect(root).toContain("from '@beautinique/frontend-components/ui'");
    expect(root).toContain("from '@beautinique/frontend-components/toast'");
    expect(root.length).toBeLessThan(1000);
  });
});
