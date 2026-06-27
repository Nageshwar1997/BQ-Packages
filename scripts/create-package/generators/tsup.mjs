import { writeFile } from "node:fs/promises";
import path from "node:path";

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
  const tsup = `import config from "../../configs/tsup/${metadata.config.tsup}";

export default config;
`;

  await writeFile(
    path.join(metadata.packageDirectory, "tsup.config.ts"),
    tsup,
    "utf8",
  );
}
