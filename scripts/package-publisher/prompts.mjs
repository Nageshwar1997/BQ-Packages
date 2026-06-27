import inquirer from 'inquirer';

import { VERSION_TYPES } from './constants.mjs';

/**
 * @import { WorkspacePackage, VersionType } from './types.mjs'
 */


/**
 * Prompts the user to select a package.
 *
 * @param {WorkspacePackage[]} packages
 * @returns {Promise<WorkspacePackage>}
 */
export async function selectPackage(packages) {
  const { pkg } = await inquirer.prompt([
    {
      type: 'list',
      name: 'pkg',
      message: 'Select a package:',
      choices: packages.map((pkg) => ({
        name: pkg.packageName,
        value: pkg,
      })),
    },
  ]);

  return pkg;
}

/**
 * Prompts the user to select multiple packages.
 *
 * @param {WorkspacePackage[]} packages
 * @returns {Promise<WorkspacePackage[]>}
 */
export async function selectPackages(packages) {
  const { selectedPackages } = await inquirer.prompt([
    {
      type: 'checkbox',
      name: 'selectedPackages',
      message: 'Select packages:',
      choices: packages.map((pkg) => ({
        name: pkg.packageName,
        value: pkg,
      })),
      validate(value) {
        return value.length > 0 || 'Select at least one package.';
      },
    },
  ]);

  return selectedPackages;
}

/**
 * Prompts the user to select a version strategy.
 *
 * @returns {Promise<VersionType>}
 */
export async function selectVersion() {
  const { version } = await inquirer.prompt([
    {
      type: 'list',
      name: 'version',
      message: 'Select version type:',
      choices: [
        VERSION_TYPES.PATCH,
        VERSION_TYPES.MINOR,
        VERSION_TYPES.MAJOR,
        VERSION_TYPES.CURRENT_VERSION,
        VERSION_TYPES.CUSTOM,
      ],
    },
  ]);

  return version;
}

/**
 * Prompts the user to confirm publishing.
 *
 * @returns {Promise<boolean>}
 */
export async function confirmPublish() {
  const { confirmed } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'confirmed',
      message: 'Continue publishing?',
      default: false,
    },
  ]);

  return confirmed;
}
