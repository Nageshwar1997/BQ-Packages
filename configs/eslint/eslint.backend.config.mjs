import sharedConfig from "./eslint.shared.config.mjs";

import tseslint from "typescript-eslint";

export default tseslint.config(
  ...sharedConfig,

  {
    files: ["**/*.{ts,mts,cts}"],

    languageOptions: { parserOptions: { projectService: true } },

    extends: [
      ...tseslint.configs.recommendedTypeChecked,
      ...tseslint.configs.strictTypeChecked,
      ...tseslint.configs.stylisticTypeChecked,
    ],

    rules: {
      /* Async */
      "@typescript-eslint/await-thenable": "error",

      "@typescript-eslint/no-floating-promises": "error",

      "@typescript-eslint/no-misused-promises": "error",

      "@typescript-eslint/require-await": "error",
    },
  },
);
