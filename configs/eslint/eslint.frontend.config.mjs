import sharedConfig from './eslint.shared.config.mjs';

import tseslint from 'typescript-eslint';

export default tseslint.config(
  ...sharedConfig,

  {
    files: ['**/*.{ts,tsx,mts,cts}'],

    languageOptions: { parserOptions: { projectService: true } },

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
