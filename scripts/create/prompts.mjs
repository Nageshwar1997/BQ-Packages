import inquirer from 'inquirer';

import { TEMPLATE_CHOICES } from './constants.mjs';
import { normalizeKeywords, normalizeText } from './utils.mjs';
import { validateDescription, validateKeywords, validatePackageName } from './validators.mjs';

/**
 * @import { PackageTemplate } from './types.mjs'
 */

/* -------------------------------------------------------------------------- */
/*                                   PROMPTS                                  */
/* -------------------------------------------------------------------------- */

/**
 * Prompts the user to select a package template.
 *
 * @returns {Promise<PackageTemplate>}
 */

export async function promptTemplate() {
  const { template } = await inquirer.prompt([
    {
      type: 'select',
      name: 'template',
      message: 'Select a package template',
      choices: TEMPLATE_CHOICES,
    },
  ]);

  return template;
}

/**
 * Prompts the user to enter a package name.
 *
 * @returns {Promise<string>}
 */
export async function promptPackageName() {
  const { packageName } = await inquirer.prompt([
    { type: 'input', name: 'packageName', message: 'Package name', validate: validatePackageName },
  ]);

  return normalizeText(packageName);
}

/**
 * Prompts the user to enter a package description.
 *
 * @returns {Promise<string>}
 */
export async function promptDescription() {
  const { description } = await inquirer.prompt([
    {
      type: 'input',
      name: 'description',
      message: 'Package description',
      validate: validateDescription,
    },
  ]);

  return normalizeText(description);
}

/**
 * Prompts the user to enter package keywords.
 *
 * @returns {Promise<string[]>}
 */
export async function promptKeywords() {
  const { keywords } = await inquirer.prompt([
    {
      type: 'input',
      name: 'keywords',
      message: 'Package keywords (comma separated)',
      validate: validateKeywords,
    },
  ]);

  return normalizeKeywords(keywords);
}

/**
 * Prompts the user to confirm package creation.
 *
 * @returns {Promise<boolean>}
 */
export async function promptConfirmation() {
  const { confirmed } = await inquirer.prompt([
    { type: 'confirm', name: 'confirmed', message: 'Create package?', default: true },
  ]);

  return confirmed;
}
