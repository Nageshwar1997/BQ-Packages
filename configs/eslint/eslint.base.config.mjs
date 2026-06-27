import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import simpleImportSort from 'eslint-plugin-simple-import-sort';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  /* Global configuration */
  {
    ignores: [
      'node_modules',
      'dist',
      'dist-ssr',
      'coverage',
      '*.d.ts',
      '*.min.js',
      '*.tsbuildinfo',
    ],
  },

  /* JavaScript recommended rules */
  js.configs.recommended,

  /* TypeScript recommended rules */
  ...tseslint.configs.recommended,

  /* Additional TypeScript strict rules */
  ...tseslint.configs.strict,

  /* TypeScript stylistic rules */
  ...tseslint.configs.stylistic,

  {
    files: ['**/*.{ts,mts,cts}'],

    plugins: { 'simple-import-sort': simpleImportSort },

    rules: {
      /* Import & Export sorting */
      'simple-import-sort/imports': 'error',
      'simple-import-sort/exports': 'error',

      'sort-imports': ['warn', { ignoreDeclarationSort: true, allowSeparatedGroups: true }],

      /* TypeScript */
      '@typescript-eslint/consistent-type-imports': 'error',

      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
      ],

      '@typescript-eslint/no-explicit-any': 'warn',

      /* JavaScript */
      'no-console': ['warn', { allow: ['warn', 'error'] }],

      'no-debugger': 'error',

      eqeqeq: ['error', 'always'],

      curly: ['error', 'all'],
    },
  },

  /* Disable formatting rules handled by Prettier */
  prettier,
);
