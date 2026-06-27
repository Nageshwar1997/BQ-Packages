import { writeFile } from "node:fs/promises";
import path from "node:path";
import {
  PACKAGE_EXPORTS,
  PACKAGE_FILES,
  PACKAGE_LICENSE,
  PACKAGE_MAIN,
  PACKAGE_MODULE,
  PACKAGE_SCRIPTS,
  PACKAGE_TYPE,
  PACKAGE_TYPES,
  PACKAGE_VERSION,
} from "../constants.mjs";

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

    version: PACKAGE_VERSION,

    description: metadata.description,

    keywords: metadata.keywords,

    license: PACKAGE_LICENSE,

    type: PACKAGE_TYPE,

    main: PACKAGE_MAIN,

    module: PACKAGE_MODULE,

    types: PACKAGE_TYPES,

    files: PACKAGE_FILES,

    exports: PACKAGE_EXPORTS,

    scripts: PACKAGE_SCRIPTS,
  };

  await writeFile(
    path.join(metadata.packageDirectory, "package.json"),
    `${JSON.stringify(packageJson, null, 2)}\n`,
    "utf8",
  );
}
