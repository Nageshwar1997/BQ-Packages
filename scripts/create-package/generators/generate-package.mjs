import { rm } from "node:fs/promises";
import { generateEslint } from "./eslint.mjs";
import { generatePackageJson } from "./package-json.mjs";
import { generateReadme } from "./readme.mjs";
import { generateTsconfig } from "./tsconfig.mjs";
import { generateTsup } from "./tsup.mjs";

/* -------------------------------------------------------------------------- */
/*                              GENERATE PACKAGE                              */
/* -------------------------------------------------------------------------- */

/**
 * Generates all package files.
 *
 * @param {object} metadata
 * @returns {Promise<void>}
 */
export async function generatePackage(metadata) {
  try {
    await generatePackageJson(metadata);
    await generateReadme(metadata);
    await generateTsconfig(metadata);
    await generateEslint(metadata);
    await generateTsup(metadata);
  } catch (error) {
    await rm(metadata.packageDirectory, {
      recursive: true,
      force: true,
    });

    throw error;
  }
}
