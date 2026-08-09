import { defineConfig } from 'tsup';
import { baseConfig } from './tsup.base.config.js';

export default defineConfig({
  ...baseConfig,

  /* Target Node.js runtime */
  platform: 'node',

  /*
   * Declaration files are generated separately, by `tsc` (see
   * `scripts/build-types`), not by tsup. tsup's own dts step runs an
   * isolated, worker-threaded TypeScript program that has proven flaky on
   * this repo's TypeScript version - it intermittently fails to emit
   * `dist/*.d.ts` with no code change and no error surfaced to the build
   * (silently leaves a package's dist without declarations). Plain `tsc
   * --emitDeclarationOnly` runs through the same path as `npm run
   * typecheck`, which has never flaked.
   */
  dts: false,
});
