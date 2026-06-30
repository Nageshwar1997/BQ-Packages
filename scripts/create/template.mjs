import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { ROOT_DIRECTORY } from '../common/paths.mjs';
import { parseData } from '../common/utils.mjs';

/**
 * @import { PackageTemplate, PackageTemplateConfig } from './types.mjs'
 */

/* -------------------------------------------------------------------------- */
/*                                  TEMPLATE                                  */
/* -------------------------------------------------------------------------- */

/**
 * Loads a package template configuration.
 *
 * @param {PackageTemplate} template
 * @returns {Promise<PackageTemplateConfig>}
 */
export async function loadTemplate(template) {
  const templatePath = path.resolve(ROOT_DIRECTORY, 'templates', template, 'template.json');

  const templateContent = await readFile(templatePath, 'utf8');

  return parseData(templateContent);
}
