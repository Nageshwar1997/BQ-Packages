// @vitest-environment node
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const dist = new URL('../dist/', import.meta.url);
const isBuilt = existsSync(new URL('index.js', dist)) && existsSync(new URL('index.cjs', dist));

const ENTRIES = ['index', 'constants/index', 'modal/index', 'vite/index'] as const;

// Plain Node loads the files, as an app's server or bundler does: vitest has its own module loader that
// can load one file twice, which would say two entries hold two copies of the constants when they do not.
const script = (kind: 'esm' | 'cjs') => `
  const ext = '${kind === 'esm' ? 'js' : 'cjs'}';
  const load = (name) => ${
    kind === 'esm'
      ? `import(require('node:url').pathToFileURL(process.env.DIST + name).href)`
      : `Promise.resolve(require(process.env.DIST + name))`
  };
  const main = async () => {
    const out = {};
    for (const entry of ${JSON.stringify(ENTRIES)}) {
      const loaded = await load(entry + '.' + ext);
      out[entry] = Object.keys(loaded).sort();
    }
    const root = await load('index.' + ext);
    const constants = await load('constants/index.' + ext);
    out.sameConstants = Object.keys(constants).every((name) => root[name] === constants[name]);
    out.modalIsAnother = typeof root.TryOnModal === 'function';
    console.log(JSON.stringify(out));
  };
  main().catch((error) => { console.error(error); process.exit(1); });
`;

type IReport = Record<string, string[] | boolean>;

const run = (kind: 'esm' | 'cjs'): IReport => {
  const output = execFileSync(
    process.execPath,
    kind === 'esm' ? ['--input-type=commonjs', '-e', script(kind)] : ['-e', script(kind)],
    { env: { ...process.env, DIST: fileURLToPath(dist) }, encoding: 'utf8' },
  );

  return JSON.parse(output.trim().split('\n').at(-1) ?? '{}') as IReport;
};

/** The packages a built file (and the relative files it imports) import, however deep. */
const packagesOf = (entry: string): Set<string> => {
  const seen = new Set<string>();
  const found = new Set<string>();
  const visit = (file: string) => {
    if (seen.has(file)) return;

    seen.add(file);

    const text = readFileSync(new URL(file, dist), 'utf8');

    for (const [, specifier] of text.matchAll(/(?:from|import)\s*['"]([^'"]+)['"]/g)) {
      if (specifier === undefined) continue;

      if (specifier.startsWith('.')) {
        visit(new URL(specifier, new URL(file, dist)).href.replace(dist.href, ''));
      } else {
        found.add(specifier);
      }
    }
  };

  visit(entry);

  return found;
};

describe.skipIf(!isBuilt)('the built files', () => {
  it.each(['esm', 'cjs'] as const)('load in Node as %s, and give the names of the API', (kind) => {
    const report = run(kind);

    expect(report.index).toContain('TryOnModal');
    expect(report.index).toContain('resolveTryOnAssetUrl');
    expect(report['constants/index']).toContain('TRYON_CATEGORY_OPTIONS');
    expect(report['constants/index']).not.toContain('TryOnModal');
    expect(report['modal/index']).toEqual(['TryOnModal']);
    expect(report['vite/index']).toEqual(['tryOnVitePlugin']);
  });

  it.each(['esm', 'cjs'] as const)(
    'have one copy of the constants for the root and /constants (%s)',
    (kind) => {
      expect(run(kind).sameConstants).toBe(true);
    },
  );

  it('keep MediaPipe, React and the icons out of the constants entry: a form of an app imports it', () => {
    const packages = packagesOf('constants/index.js');

    expect([...packages].filter((name) => /react|mediapipe|iconify/.test(name))).toEqual([]);
  });

  it('keep MediaPipe out of the root: the root loads the modal with an import() when it is opened', () => {
    const rootPackages = packagesOf('index.js');
    const rootText = readFileSync(new URL('index.js', dist), 'utf8');

    expect([...rootPackages].filter((name) => name.includes('mediapipe'))).toEqual([]);
    expect(rootText).toMatch(/import\(['"]\.\/modal\/index\.js['"]\)/);
  });

  it('have MediaPipe in the modal, where the engines are', () => {
    expect([...packagesOf('modal/index.js')]).toContain('@mediapipe/tasks-vision');
  });

  it('give declarations for every entry, and for the CommonJS ones', () => {
    for (const entry of ENTRIES) {
      expect(existsSync(new URL(`${entry}.d.ts`, dist)), `${entry}.d.ts`).toBe(true);
      expect(existsSync(new URL(`${entry}.d.cts`, dist)), `${entry}.d.cts`).toBe(true);
    }
  });
});
