import { writeFile } from "node:fs/promises";
import path from "node:path";

/* -------------------------------------------------------------------------- */
/*                               PACKAGE JSON                                 */
/* -------------------------------------------------------------------------- */

/**
 * Generates the package.json file.
 *
 * @param {object} metadata
 * @returns {Promise<void>}
 */
export async function generatePackageJson(metadata) {
  const packageJson = {
    name: metadata.scopedPackageName,
    version: "1.0.0",
    description: metadata.description,
    keywords: metadata.keywords,

    license: "MIT",

    type: "module",

    main: "./dist/index.cjs",
    module: "./dist/index.js",
    types: "./dist/index.d.ts",

    files: ["dist"],

    exports: {
      ".": {
        types: "./dist/index.d.ts",
        import: "./dist/index.js",
        require: "./dist/index.cjs",
        default: "./dist/index.js",
      },
    },

    scripts: {
      build: "tsup",
      dev: "tsup --watch",
      lint: "eslint .",
      "type-check": "tsc --noEmit",
    },
  };

  await writeFile(
    path.join(metadata.packageDirectory, "package.json"),
    `${JSON.stringify(packageJson, null, 2)}\n`,
    "utf8",
  );
}
