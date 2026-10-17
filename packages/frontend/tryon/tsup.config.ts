import { defineConfig } from 'tsup';

import { baseConfig } from '../../../configs/tsup/tsup.base.config.js';

/*
 * The public import paths: `constants` is built from `src/constants/index.ts` into
 * `dist/constants/index.js` (and `.cjs`). It is the same list as the "exports" of package.json and the
 * folders of `src` that have an `index.ts` (`src/api.test.ts` fails when one of the three differs).
 * (`.` is `src/index.ts`.)
 */
export const ENTRY_DIRS = ['constants', 'modal', 'vite'] as const;

const entry: Record<string, string> = {
  index: 'src/index.ts',
  ...Object.fromEntries(ENTRY_DIRS.map((dir) => [`${dir}/index`, `src/${dir}/index.ts`])),
};

/*
 * Unlike the components package (every entry one self-contained file), the ESM files share chunks:
 * the modal, the constants and the root all use the constants, and the root loads the modal with a
 * dynamic `import()` - with a chunk for what they share, the constants are in the app once, and the
 * heavy part (MediaPipe, the engines) is its own chunk that an app only fetches when the modal is
 * opened. Nothing in the package keeps state that two copies could split: the models are cached in a
 * module of the engines, and that is only in the modal's chunks. The CommonJS files cannot be split
 * (esbuild does it for ESM only), they are one file per entry.
 *
 * The rest is what `tsup.frontend.config.ts` sets (browser platform, declarations from `tsc`); it
 * cannot be spread here because that file exports the already defined config. `vite/index.ts` runs in
 * Node (the build of an app), so `node:fs` and `vite` are left to it.
 */
export default defineConfig({
  ...baseConfig,
  platform: 'browser',
  dts: false,
  entry,
  splitting: true,
  external: ['node:fs', 'vite'],
});
