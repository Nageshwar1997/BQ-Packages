import { confirm, input, select } from '@inquirer/prompts';
import { normalizeKeywords, normalizeText } from './utils.mjs';
import { validateDescription, validateKeywords, validatePackageName } from './validators.mjs';

/* -------------------------------------------------------------------------- */
/*                                   PROMPTS                                  */
/* -------------------------------------------------------------------------- */

/**
 * Prompts the user to select a package template.
 *
 * @returns {Promise<"shared" | "backend" | "frontend">}
 */
export async function promptTemplate() {
  return select({
    message: 'Select a package template',
    choices: [
      { name: 'Shared', value: 'shared', description: 'Create a shared package' },
      { name: 'Backend', value: 'backend', description: 'Create a backend package' },
      { name: 'Frontend', value: 'frontend', description: 'Create a frontend package' },
    ],
  });
}

/**
 * Prompts the user to enter a package name.
 *
 * @returns {Promise<string>}
 */
export async function promptPackageName() {
  return normalizeText(await input({ message: 'Package name', validate: validatePackageName }));
}

/**
 * Prompts the user to enter a package description.
 *
 * @returns {Promise<string>}
 */
export async function promptDescription() {
  return normalizeText(
    await input({ message: 'Package description', validate: validateDescription }),
  );
}

/**
 * Prompts the user to enter package keywords.
 *
 * @returns {Promise<string[]>}
 */
export async function promptKeywords() {
  return normalizeKeywords(
    await input({ message: 'Package keywords (comma separated)', validate: validateKeywords }),
  );
}

/**
 * Prompts the user to confirm package creation.
 *
 * @returns {Promise<boolean>}
 */
export async function promptConfirmation() {
  return confirm({ message: 'Create package?', default: true });
}
