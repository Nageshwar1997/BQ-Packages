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
});
