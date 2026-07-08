import type { Options } from 'tsup';

import config from '../../../configs/tsup/tsup.backend.config.js';

// `defineConfig`'s return type is widened to include its function-argument
// overload, even though `tsup.backend.config.ts` always passes it a plain
// options object - this narrows it back for the spread below.
const baseOptions = config as Options;

const overriddenConfig: Options = {
  ...baseOptions,

  /*
   * Separate entry points, each producing its own bundled `.d.ts`.
   *
   * `cors` and `mongoose` are both OPTIONAL peer dependencies - most
   * services only need `checkEmptyRequest`/`serviceAccess`/`tryCatch`
   * (the `index` entry, which never references either). Bundling
   * everything into a single `index.d.ts` would force every consumer's
   * own `tsc` to resolve `cors`'s and `mongoose`'s types just to import
   * anything from this package at all, even if they never touch
   * `corsMiddleware`/`tryCatchSession` - which defeats the point of those
   * dependencies being optional. Keeping `cors`/`session` as separate
   * subpath exports (`@beautinique/backend-middlewares/cors`,
   * `.../session`) keeps each dependency's types confined to the one
   * entry that actually needs them.
   */
  entry: {
    index: 'src/index.ts',
    cors: 'src/cors.ts',
    session: 'src/session.ts',
  },

  // `src/types/globals.ts` is imported purely so the DTS bundler retains
  // its ambient `declare global` block in each entry's `.d.ts` (see that
  // file). It compiles to an empty module, so esbuild - honoring this
  // package's own `sideEffects: false` - correctly drops the import from
  // the JS output, but warns about it; that warning is expected here, not
  // a sign of a real dropped side effect.
  esbuildOptions(options) {
    options.logOverride = { ...options.logOverride, 'ignored-bare-import': 'silent' };
  },
};

export default overriddenConfig;
