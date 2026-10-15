import { defineConfig, type Options } from 'tsup';

import { baseConfig } from '../../../configs/tsup/tsup.base.config.js';

type TPlugin = NonNullable<Options['esbuildPlugins']>[number];

const PACKAGE_NAME = '@beautinique/frontend-components';

/*
 * The public import paths other than the root, one per entry: `stepper` is built from
 * `src/stepper/index.ts` into `dist/stepper/index.js` (and `.cjs`). It is the same list as the
 * "exports" of package.json and the folders of `src` that have an `index.ts`; `src/api.test.ts` fails
 * when one of the three differs. (`.` is `src/index.ts`.)
 */
export const ENTRY_DIRS = [
  'auth',
  'breadcrumb',
  'color-input',
  'file-input',
  'hierarchy-select',
  'inputs',
  'layout',
  'linear-gradient',
  'loading-screen',
  'media',
  'resend',
  'static-page',
  'stepper',
  'testimonials',
  'theme',
  'toast',
  'ui',
] as const;

const entry: Record<string, string> = {
  index: 'src/index.ts',
  ...Object.fromEntries(ENTRY_DIRS.map((dir) => [`${dir}/index`, `src/${dir}/index.ts`])),
};

const SRC_URL = new URL('./src/', import.meta.url).href;

/** The folder an import of an `index.js` goes to, as a path inside `src` (`layout`), or undefined. */
const entryOf = (resolveDir: string, specifier: string) => {
  const base = `file:///${resolveDir.replaceAll('\\', '/').replace(/^\/+/, '')}/`;
  const target = new URL(specifier, base).href;

  return ENTRY_DIRS.find((dir) => target === `${SRC_URL}${dir}/index.js`);
};

/** Whether the file that imports (in `resolveDir`) is one of the files of the entry `dir`. */
const isInside = (resolveDir: string, dir: string) => {
  const own = `${SRC_URL}${dir}/`;
  const here = `file:///${resolveDir.replaceAll('\\', '/').replace(/^\/+/, '')}/`;

  return here.startsWith(own);
};

/*
 * A file that imports another entry (`../layout/index.js`, or `./ui/index.js` in the root file) gets
 * an import of the package's own path for it (`@beautinique/frontend-components/layout`, which the
 * "exports" of package.json send to the ESM or the CJS file) instead of a copy of it. Bundled, the
 * root and `/toast` would each hold a toast store of their own (a toast shown through one would never
 * reach the `ToastContainer` of the other), and every entry that uses a modal, an input or a loader
 * would carry its own copy of it. (Relative paths to the built files would do for ESM, but the
 * `treeshake` step of tsup writes `.js` into the CJS file too.)
 *
 * Inside an entry its own files are bundled as usual; `src/entries.test.ts` checks that an entry
 * reaches the other ones through their `index.js` and not through a file of theirs, which this plugin
 * could not tell from a file of its own.
 */
const keepEntriesExternal: TPlugin = {
  name: 'keep-entries-external',
  setup(build) {
    build.onResolve({ filter: /^\.{1,2}\/(?:.*\/)?index\.js$/ }, (args) => {
      const dir = entryOf(args.resolveDir, args.path);

      if (dir === undefined || isInside(args.resolveDir, dir)) return undefined;

      return { path: `${PACKAGE_NAME}/${dir}`, external: true };
    });
  },
};

/*
 * Every entry is built as one self-contained file (no code splitting, see the base config), so the
 * side effects of an entry run when that entry is imported, whatever the consumer's tree-shaking does.
 *
 * The rest is what `tsup.frontend.config.ts` sets (browser platform, declarations from `tsc`); it
 * cannot be spread here because that file exports the already defined config.
 */
export default defineConfig({
  ...baseConfig,
  platform: 'browser',
  dts: false,
  entry,
  esbuildPlugins: [keepEntriesExternal],
  // A bare `import './file.js'` of a file that "sideEffects" in package.json does not list is dropped
  // from the bundle and only warned about: the code of that file (e.g. the toast icons) would be
  // missing from the published package. Fail the build instead of publishing that.
  esbuildOptions(options) {
    options.logOverride = { ...options.logOverride, 'ignored-bare-import': 'error' };
  },
});
