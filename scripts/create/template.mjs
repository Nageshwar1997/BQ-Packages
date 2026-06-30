import { readFile } from 'node:fs/promises';
import path from 'node:path';

/* -------------------------------------------------------------------------- */
/*                                  TEMPLATE                                  */
/* -------------------------------------------------------------------------- */

/**
 * Loads a package template configuration.
 *
 * @param {"shared" | "backend" | "frontend"} template
 * @returns {Promise<object>}
 */
export async function loadTemplate(template) {
  const templatePath = path.resolve(process.cwd(), 'templates', template, 'template.json');

  const templateContent = await readFile(templatePath, 'utf8');

  return JSON.parse(templateContent);
}
