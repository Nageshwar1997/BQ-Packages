import { writeFile } from "node:fs/promises";
import path from "node:path";

/* -------------------------------------------------------------------------- */
/*                                   ESLINT                                   */
/* -------------------------------------------------------------------------- */

/**
 * Generates the eslint.config.mjs file.
 *
 * @param {object} metadata
 * @returns {Promise<void>}
 */
export async function generateEslint(metadata) {
  const eslint = `import config from "../../configs/eslint/${metadata.config.eslint}";

export default config;
`;

  await writeFile(
    path.join(metadata.packageDirectory, "eslint.config.mjs"),
    eslint,
    "utf8",
  );
}
