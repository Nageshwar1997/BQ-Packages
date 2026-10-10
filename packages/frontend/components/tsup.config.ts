import { defineConfig, type Options } from 'tsup';

import { baseConfig } from '../../../configs/tsup/tsup.base.config.js';

type TPlugin = NonNullable<Options['esbuildPlugins']>[number];

const PACKAGE_NAME = '@beautinique/frontend-components';

/*
 * The root entry re-exports `./ui/index.js` and `./toast/index.js`. In the root file those stay
 * imports of `@beautinique/frontend-components/ui` and `/toast` (the package's own paths, which the
 * "exports" of package.json send to the ESM or the CJS file) instead of being bundled into it:
 * bundled, the root and `/toast` would each hold a toast store of their own, and `toaster` from one
 * path would not reach the `ToastContainer` of the other. (Relative paths to the built files would
 * do for ESM, but the `treeshake` step of tsup writes `.js` into the CJS file too.)
 */
const keepEntriesExternal: TPlugin = {
  name: 'keep-entries-external',
  setup(build) {
    build.onResolve({ filter: /^\.\/(ui|toast)\/index\.js$/ }, (args) => {
      if (!/[\\/]src[\\/]index\.ts$/.test(args.importer)) return undefined;

      return { path: `${PACKAGE_NAME}/${args.path.split('/')[1] ?? ''}`, external: true };
    });
  },
};

/*
 * One entry per public import path (see "exports" in package.json). Every entry is built as one
 * self-contained file (no code splitting, see the base config), so the side effects of an entry
 * (e.g. the toast icons) run when that entry is imported, whatever the consumer's tree-shaking does.
 *
 * The rest is what `tsup.frontend.config.ts` sets (browser platform, declarations from `tsc`); it
 * cannot be spread here because that file exports the already defined config.
 */
export default defineConfig({
  ...baseConfig,
  platform: 'browser',
  dts: false,
  entry: {
    index: 'src/index.ts',
    'ui/index': 'src/ui/index.ts',
    'toast/index': 'src/toast/index.ts',
  },
  esbuildPlugins: [keepEntriesExternal],
  // A bare `import './file.js'` of a file that "sideEffects" in package.json does not list is dropped
  // from the bundle and only warned about: the code of that file (e.g. the toast icons) would be
  // missing from the published package. Fail the build instead of publishing that.
  esbuildOptions(options) {
    options.logOverride = { ...options.logOverride, 'ignored-bare-import': 'error' };
  },
});
