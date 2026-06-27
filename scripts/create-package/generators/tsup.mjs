import { writeFile } from "node:fs/promises";
import path from "node:path";
import { SHARED_CONFIGS_DIRECTORY } from "../constants.mjs";

/* -------------------------------------------------------------------------- */
/*                                    TSUP                                    */
/* -------------------------------------------------------------------------- */

/**
 * Generates the tsup.config.ts file.
 *
 * @param {object} metadata
 * @returns {Promise<void>}
 */
export async function generateTsup(metadata) {
  const tsup = `import config from "${SHARED_CONFIGS_DIRECTORY}/tsup/${metadata.config.tsup}";

export default config;
`;

  await writeFile(
    path.join(metadata.packageDirectory, "tsup.config.ts"),
    tsup,
    "utf8",
  );
}
