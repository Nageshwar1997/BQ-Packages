import { cp } from 'node:fs/promises';
import path from 'node:path';

/* -------------------------------------------------------------------------- */
/*                               COPY TEMPLATE                                */
/* -------------------------------------------------------------------------- */

/**
 * Copies the base template into the package directory.
 *
 * @param {string} templatePath
 * @returns {Promise<void>}
 */
export async function copyBaseTemplate(templatePath) {
  const sourceDirectory = path.join(process.cwd(), 'templates', 'base');

  await cp(sourceDirectory, templatePath, { recursive: true });
}
