import inquirer from 'inquirer';
import { description, heading, info, success, warning } from '../common/colors.mjs';
import { buildConfirmationMessage, confirm, getPackageChoices } from '../common/prompts.mjs';
import { getCommonChoices } from '../common/utils.mjs';
import { PUBLISH_CHOICES } from './constants.mjs';

/**
 * @import { PublishAction, VersionType } from './types.mjs'
 */

/**
 * @import { PublishPackageMetadata } from '../common//types.mjs'
 */

/* -------------------------------------------------------------------------- */
/*                              PRIVATE HELPERS                               */
/* -------------------------------------------------------------------------- */



/* -------------------------------------------------------------------------- */
/*                                  ACTION                                    */
/* -------------------------------------------------------------------------- */

/**
 * Prompts the user to select an action.
 *
 * @param {string | null} username
 * @returns {Promise<PublishAction>}
 */
export async function selectPublishAction(username) {
  const { action } = await inquirer.prompt([
    {
      type: 'select',
      name: 'action',
      message: heading('What would you like to do?'),
      choices: [...PUBLISH_CHOICES, ...getCommonChoices(username)],
    },
  ]);

  return action;
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

/* -------------------------------------------------------------------------- */
/*                                  CONFIRM                                   */
/* -------------------------------------------------------------------------- */

/**
 * Prompts the user to confirm publishing.
 *
 * @param {PublishPackageMetadata} metadata
 * @returns {Promise<boolean>}
 */
export function confirmPublish(metadata) {
  return confirm(
    buildConfirmationMessage(heading(`Publish "${success(metadata.npmPackageName)}"?`), [
      `${description('Workspace :')} ${info(metadata.workspaceName)}`,
      `${description('Version   :')} ${warning(metadata.localVersion)}`,
    ]),
  );
}

/**
 * Prompts the user to confirm publishing multiple packages.
 *
 * @param {PublishPackageMetadata[]} packages
 * @returns {Promise<boolean>}
 */
export function confirmPublishMany(packages) {
  return confirm(
    buildConfirmationMessage(
      heading(
        `Publish ${success(String(packages.length))} new package${packages.length === 1 ? '' : 's'}?`,
      ),
      packages.map(
        (pkg) =>
          `${info(pkg.workspaceName.padEnd(20))} ${warning(pkg.localVersion.padEnd(10))} ${description(pkg.npmPackageName)}`,
      ),
    ),
  );
}
