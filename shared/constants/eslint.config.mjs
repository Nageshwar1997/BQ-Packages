import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import tseslint from 'typescript-eslint';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default [
  // Ignore some folders
  { ignores: ['dist', 'node_modules'] },

  // Base JS rules
  js.configs.recommended,

  // TypeScript rules (modern setup)
  ...tseslint.configs.recommended,
  ...tseslint.configs.strict,
  ...tseslint.configs.stylistic,

  {
    files: ['**/*.ts'],

    languageOptions: {
      parser: tseslint.parser,

      parserOptions: { project: true, tsconfigRootDir: __dirname },
    },

    rules: {
      // 🔥 Important rules (production level)
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],

      '@typescript-eslint/no-explicit-any': 'warn',

      '@typescript-eslint/consistent-type-imports': 'error',

      // Code quality
      'no-debugger': 'error',

      // Best practices
      eqeqeq: ['error', 'always'],

      curly: ['error', 'all'],

      // Imports cleanliness
      'sort-imports': ['warn', { ignoreDeclarationSort: true }],
    },
  },

  prettier,
];
