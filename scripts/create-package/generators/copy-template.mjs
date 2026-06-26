import { cp } from "node:fs/promises";
import path from "node:path";

/* -------------------------------------------------------------------------- */
/*                               COPY TEMPLATE                                */
/* -------------------------------------------------------------------------- */

/**
 * Copies the base template into the package directory.
 *
 * @param {object} metadata
 * @returns {Promise<void>}
 */
export async function copyBaseTemplate(metadata) {
  const sourceDirectory = path.join(process.cwd(), "templates", "base");

  await cp(sourceDirectory, metadata.packageDirectory, {
    recursive: true,
  });
}
