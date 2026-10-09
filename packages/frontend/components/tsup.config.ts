import { defineConfig } from 'tsup';

import { baseConfig } from '../../../configs/tsup/tsup.base.config.js';

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
  // A bare `import './file.js'` of a file that "sideEffects" in package.json does not list is dropped
  // from the bundle and only warned about: the code of that file (e.g. the toast icons) would be
  // missing from the published package. Fail the build instead of publishing that.
  esbuildOptions(options) {
    options.logOverride = { ...options.logOverride, 'ignored-bare-import': 'error' };
  },
});
