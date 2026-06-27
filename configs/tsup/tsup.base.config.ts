import type { Options } from 'tsup';

export const baseConfig: Options = {
  /* Entry files */
  entry: ['src/index.ts'],

  /* Output formats */
  format: ['esm', 'cjs'],

  /* Generate TypeScript declaration files */
  dts: true,

  /* Target JavaScript version */
  target: 'es2025',

  /* Clean output directory before build */
  clean: true,

  /* Generate source maps */
  sourcemap: true,

  /* Enable tree shaking */
  treeshake: true,

  /* Keep original class and function names */
  keepNames: true,

  /* Don't split output into multiple chunks */
  splitting: false,

  /*
   * Don't minify library output
   * Let the consumer's bundler handle minification.
   */
  minify: false,

  /* Output directory */
  outDir: 'dist',
};
