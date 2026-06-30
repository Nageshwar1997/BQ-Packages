import inquirer from 'inquirer';
import { heading } from './colors.mjs';
/**
 * @import { PublishPackageMetadata } from './types.mjs'
 */

/* -------------------------------------------------------------------------- */
/*                               PUBLIC HELPERS                               */
/* -------------------------------------------------------------------------- */

/**
 * Builds a confirmation message.
 *
 * @param {string} title
 * @param {string[]} lines
 * @returns {string}
 */
export function buildConfirmationMessage(title, lines) {
  return [title, '', ...lines].join('\n');
}

/**
 * Returns package choices sorted by workspace name.
 *
 * @param {PublishPackageMetadata[]} packages
 * @returns {{
 *   name: string;
 *   value: PublishPackageMetadata;
 * }[]}
 */
function getPackageChoices(packages) {
  return [...packages]
    .sort((a, b) => a.workspaceName.localeCompare(b.workspaceName))
    .map((pkg) => ({
      name: `${pkg.workspaceName} (${pkg.npmPackageName}) v${pkg.localVersion}`,
      value: pkg,
    }));
}

/**
 * Prompts the user for confirmation.
 *
 * @param {string} message
 * @returns {Promise<boolean>}
 */
export async function confirm(message) {
  const { confirmed } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'confirmed',
      message,
      default: true,
    },
  ]);

  return confirmed;
}

/* -------------------------------------------------------------------------- */
/*                                  PACKAGE                                   */
/* -------------------------------------------------------------------------- */

/**
 * Prompts the user to select a package.
 *
 * @param {PublishPackageMetadata[]} packages
 * @returns {Promise<PublishPackageMetadata>}
 */
export async function selectPackage(packages) {
  const { pkg } = await inquirer.prompt([
    {
      type: 'select',
      name: 'pkg',
      message: heading('Select a package:'),
      choices: getPackageChoices(packages),
    },
  ]);

  return pkg;
}

/**
 * Prompts the user to select multiple packages.
 *
 * @param {PublishPackageMetadata[]} packages
 * @returns {Promise<PublishPackageMetadata[]>}
 */
export async function selectPackages(packages) {
  const { packages: selectedPackages } = await inquirer.prompt([
    {
      type: 'checkbox',
      name: 'packages',
      message: heading('Select packages:'),
      choices: getPackageChoices(packages),
      validate(value) {
        return value.length > 0 || 'Select at least one package.';
      },
    },
  ]);

  return selectedPackages;
}
