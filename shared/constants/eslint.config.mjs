import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import simpleImportSort from 'eslint-plugin-simple-import-sort';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  /* Global configuration */
  { ignores: ['dist', 'coverage', 'node_modules', '*.d.ts', '*.min.js'] },

  /* JavaScript recommended rules */
  js.configs.recommended,

  {
    files: ['**/*.{ts,mts,cts}'],
    extends: [
      /* TypeScript recommended rules */
      ...tseslint.configs.recommendedTypeChecked,

      /* Additional strict TypeScript rules */
      ...tseslint.configs.strictTypeChecked,

      /* TypeScript stylistic rules */
      ...tseslint.configs.stylisticTypeChecked,
    ],

    plugins: { 'simple-import-sort': simpleImportSort },

    languageOptions: {
      parserOptions: { projectService: { allowDefaultProject: ['tsup.config.ts'] } },
    },

    rules: {
      /* Import & Export Rules */
      'simple-import-sort/imports': 'error',
      'simple-import-sort/exports': 'error',

      'sort-imports': ['warn', { ignoreDeclarationSort: true, allowSeparatedGroups: true }],

      /* TypeScript Rules */
      '@typescript-eslint/consistent-type-imports': 'error',

      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
      ],

      '@typescript-eslint/no-explicit-any': 'warn',

      '@typescript-eslint/no-floating-promises': 'error',

      '@typescript-eslint/no-misused-promises': 'error',

      '@typescript-eslint/await-thenable': 'error',

      '@typescript-eslint/require-await': 'error',

      /* JavaScript Rules */
      'no-console': ['error', { allow: ['warn', 'error'] }],

      'no-debugger': 'error',

      eqeqeq: ['error', 'always'],

      curly: ['error', 'all'],
    },
  },

  /* Disable formatting rules handled by Prettier */
  prettier,
);
