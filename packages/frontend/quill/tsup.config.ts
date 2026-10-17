import { defineConfig } from 'tsup';

import { baseConfig } from '../../../configs/tsup/tsup.base.config.js';

/*
 * The public import paths other than the root: `editor` is built from `src/editor/index.ts` into
 * `dist/editor/index.js` (and `.cjs`). It is the same list as the "exports" of package.json and the
 * folders of `src` that have an `index.ts`; `src/api.test.ts` fails when one of the three differs.
 * (`.` is `src/index.ts`, the viewer.)
 *
 * The viewer and the editor are apart on purpose: the root never imports `quill`, so an app that only
 * shows saved content (a shop front) does not load the editor, and does not need `quill` installed.
 */
export const ENTRY_DIRS = ['editor'] as const;

const entry: Record<string, string> = {
  index: 'src/index.ts',
  ...Object.fromEntries(ENTRY_DIRS.map((dir) => [`${dir}/index`, `src/${dir}/index.ts`])),
};

/*
 * Every entry is built as one self-contained file (no code splitting, see the base config). What the
 * two entries both use (`sanitizeQuillHtml`) is a few lines without state, so a copy of it in each is
 * harmless; DOMPurify itself is a dependency and stays outside the files.
 *
 * The rest is what `tsup.frontend.config.ts` sets (browser platform, declarations from `tsc`); it
 * cannot be spread here because that file exports the already defined config.
 */
export default defineConfig({
  ...baseConfig,
  platform: 'browser',
  dts: false,
  entry,
  // A bare `import './file.js'` of a file that "sideEffects" in package.json does not list is dropped
  // from the bundle and only warned about: its code would be missing from the published package.
  // Fail the build instead of publishing that.
  esbuildOptions(options) {
    options.logOverride = { ...options.logOverride, 'ignored-bare-import': 'error' };
  },
});
