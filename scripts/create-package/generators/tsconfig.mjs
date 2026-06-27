import { writeFile } from "node:fs/promises";
import path from "node:path";
import { CONFIGS_DIRECTORY } from "../constants.mjs";

/* -------------------------------------------------------------------------- */
/*                                 TSCONFIG                                   */
/* -------------------------------------------------------------------------- */

/**
 * Generates the tsconfig.json file.
 *
 * @param {object} metadata
 * @returns {Promise<void>}
 */
export async function generateTsconfig(metadata) {
  const tsconfig = {
    extends: `${CONFIGS_DIRECTORY}/tsconfig/${metadata.config.tsconfig}`,
  };

  await writeFile(
    path.join(metadata.packageDirectory, "tsconfig.json"),
    `${JSON.stringify(tsconfig, null, 2)}\n`,
    "utf8",
  );
}
