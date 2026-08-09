import inquirer from 'inquirer';
import semver from 'semver';
import { description, error, heading, info, success, warning } from '../common/colors.mjs';
import { buildConfirmationMessage, confirm } from '../common/prompts.mjs';
import { getCommonChoices } from '../common/utils.mjs';
import { REPUBLISH_CHOICES, VERSION_TYPES_CHOICES } from './constants.mjs';

/**
 * @import { RepublishAction, VersionType } from './types.mjs'
 * @import { PublishPackageMetadata } from '../common/types.mjs'
 */

/* -------------------------------------------------------------------------- */
/*                                  ACTION                                    */
/* -------------------------------------------------------------------------- */

/**
 * Prompts the user to select an action.
 *
 * @param {string | null} username
 * @returns {Promise<RepublishAction>}
 */
export async function selectRepublishAction(username) {
  const { action } = await inquirer.prompt([
    {
      type: 'select',
      name: 'action',
      message: heading('What would you like to republish?'),
      choices: [...REPUBLISH_CHOICES, ...getCommonChoices(username)],
    },
  ]);

  return action;
}

/* -------------------------------------------------------------------------- */
/*                                  VERSION                                   */
/* -------------------------------------------------------------------------- */

/**
 * Prompts the user to select a version strategy.
 *
 * @param {string} currentVersion
 * @param {string} packageName
 * @returns {Promise<VersionType>}
 */
export async function selectVersion(currentVersion, packageName) {
  const { versionType } = await inquirer.prompt([
    {
      type: 'select',
      name: 'versionType',
      message: [
        heading('Select the next version strategy'),
        '',
        `${description('Package :')} ${success(packageName)}`,
        `${description('Version :')} ${warning(currentVersion)}`,
      ].join('\n'),
      choices: VERSION_TYPES_CHOICES,
    },
  ]);

  return versionType;
}

/**
 * Prompts the user for a custom version.
 *
 * @param {string} currentVersion
 * @returns {Promise<string>}
 */
export async function enterCustomVersion(currentVersion) {
  const { version } = await inquirer.prompt([
    {
      type: 'input',
      name: 'version',
      message: [
        heading('Enter custom version'),
        '',
        `${description('Current :')} ${warning(currentVersion)}`,
      ].join('\n'),
      default: currentVersion,
      validate(value) {
        if (!semver.valid(value)) {
          return error('Enter a valid semantic version.');
        }

        if (!semver.gt(value, currentVersion)) {
          return error('Version must be greater than the current version.');
        }

        return true;
      },
    },
  ]);

  return version;
}

/* -------------------------------------------------------------------------- */
/*                                  CONFIRM                                   */
/* -------------------------------------------------------------------------- */

/**
 * Prompts the user to confirm republishing.
 *
 * @param {PublishPackageMetadata} metadata
 * @param {string} version
 * @returns {Promise<boolean>}
 */
export function confirmRepublish(metadata, version) {
  return confirm(
    buildConfirmationMessage(heading(`Republish "${success(metadata.npmPackageName)}"?`), [
      `${description('Workspace       :')} ${info(metadata.workspaceName)}`,
      `${description('Current Version :')} ${warning(metadata.localVersion)}`,
      `${description('Next Version    :')} ${success(version)}`,
    ]),
  );
}

/**
 * Prompts the user to confirm republishing multiple packages.
 *
 * @param {{
 *   metadata: PublishPackageMetadata;
 *   version: string;
 * }[]} packages
 * @returns {Promise<boolean>}
 */
export function confirmRepublishMany(packages) {
  return confirm(
    buildConfirmationMessage(
      heading(
        `Republish ${success(String(packages.length))} package${packages.length === 1 ? '' : 's'}?`,
      ),
      packages.map(
        ({ metadata, version }) =>
          `${info(metadata.workspaceName.padEnd(20))} ${warning(metadata.localVersion)} ${description('→')} ${success(version)}`,
      ),
    ),
  );
}
