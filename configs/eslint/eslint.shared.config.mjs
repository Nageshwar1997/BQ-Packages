import baseConfig from './eslint.base.config.mjs';

import tseslint from 'typescript-eslint';

export default tseslint.config(
  ...baseConfig,

  {
    files: ['**/*.{ts,mts,cts}'],

    languageOptions: {
      parserOptions: {
        /*
         * `tsup.config.ts` is excluded from each shared/backend package's
         * own tsconfig.json (so `tsc --emitDeclarationOnly` doesn't trip
         * over it when computing `rootDir` - see `scripts/build-types`).
         * Without this, typescript-eslint can't find it in any project and
         * errors; `allowDefaultProject` lets it still be type-checked, via
         * an isolated, default program instead of requiring tsconfig
         * membership. (`eslint.backend.config.mjs` re-declares this same
         * option for backend packages specifically - this covers every
         * other category, e.g. `shared/*`, that uses this config directly.)
         */
        projectService: { allowDefaultProject: ['tsup.config.ts'] },
      },
    },

    extends: [
      ...tseslint.configs.recommendedTypeChecked,
      ...tseslint.configs.strictTypeChecked,
      ...tseslint.configs.stylisticTypeChecked,
    ],

    rules: {
      /* Async */
      '@typescript-eslint/await-thenable': 'error',

      '@typescript-eslint/no-floating-promises': 'error',

      '@typescript-eslint/no-misused-promises': 'error',

      '@typescript-eslint/require-await': 'error',
    },
  },
);
