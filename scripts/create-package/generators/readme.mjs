import { writeFile } from "node:fs/promises";
import path from "node:path";
import { PACKAGE_LICENSE } from "../constants.mjs";

/* -------------------------------------------------------------------------- */
/*                                   README                                   */
/* -------------------------------------------------------------------------- */

/**
 * Generates the README.md file.
 *
 * @param {object} metadata
 * @returns {Promise<void>}
 */
export async function generateReadme(metadata) {
  const readme = `# ${metadata.scopedPackageName}

${metadata.description}

## License

${PACKAGE_LICENSE}
`;

  await writeFile(
    path.join(metadata.packageDirectory, "README.md"),
    readme,
    "utf8",
  );
}
