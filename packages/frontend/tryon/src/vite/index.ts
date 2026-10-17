import { readFileSync } from 'node:fs';

import type { Plugin } from 'vite';

/** The path of the bundle of MediaPipe that has the wrong source map comment. */
const BUNDLE = '@mediapipe/tasks-vision/vision_bundle.mjs';

const WRONG_COMMENT = '//# sourceMappingURL=vision_bundle_mjs.js.map';
const RIGHT_COMMENT = '//# sourceMappingURL=vision_bundle.mjs.map';

/**
 * What a Vite app needs to run the try-on:
 *
 * - `@mediapipe/tasks-vision` is kept out of the pre-bundling (`optimizeDeps.exclude`). It loads its
 *   own WebAssembly runtime, and Vite's pre-bundler breaks that at development time.
 * - The wrong source map comment at the end of its `vision_bundle.mjs` is corrected: it points at
 *   `vision_bundle_mjs.js.map`, but the file next to it is `vision_bundle.mjs.map`, so the dev server
 *   logged "Failed to load source map" for a file that was never going to exist under that name. It
 *   has to be fixed in `load()`: Vite takes the comment out of what `load()` returns *before* it
 *   runs the `transform` hooks, so a `transform` is too late. The id comes with a `?v=<hash>`
 *   suffix, so it is matched with `includes` and the suffix is cut before the file is read.
 *
 * ```ts
 * // vite.config.ts
 * import { tryOnVitePlugin } from '@beautinique/frontend-tryon/vite';
 *
 * export default defineConfig({ plugins: [react(), tryOnVitePlugin()] });
 * ```
 */
export const tryOnVitePlugin = (): Plugin => ({
  name: 'beautinique-tryon',

  config: () => ({ optimizeDeps: { exclude: ['@mediapipe/tasks-vision'] } }),

  load(id) {
    if (!id.includes(BUNDLE)) {
      return null;
    }

    return readFileSync(id.replace(/\?.*$/, ''), 'utf8').replace(WRONG_COMMENT, RIGHT_COMMENT);
  },
});
