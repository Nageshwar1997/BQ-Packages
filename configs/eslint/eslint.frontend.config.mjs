import sharedConfig from './eslint.shared.config.mjs';

import tseslint from 'typescript-eslint';

export default tseslint.config(
  ...sharedConfig,

  {
    files: ['**/*.{ts,tsx,mts,cts}'],

    languageOptions: {
      parserOptions: {
        /*
         * `tsup.config.ts` is excluded from each frontend package's own
         * tsconfig.json (so `tsc --emitDeclarationOnly` doesn't trip over
         * it when computing `rootDir` - see `scripts/build-types`).
         * Without this, typescript-eslint can't find it in any project and
         * errors; `allowDefaultProject` lets it still be type-checked, via
         * an isolated, default program instead of requiring tsconfig
         * membership.
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
      /* React projects commonly use async event handlers */
      '@typescript-eslint/no-misused-promises': [
        'error',
        { checksVoidReturn: { attributes: false } },
      ],
    },
  },
);
