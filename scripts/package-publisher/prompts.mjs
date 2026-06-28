import inquirer from 'inquirer';
import semver from 'semver';
import { ACTIONS, VERSION_TYPES } from './constants.mjs';

/**
 * @import { Action, PackageMetadata, WorkspacePackage, VersionType } from './types.mjs'
 */

/* -------------------------------------------------------------------------- */
/*                                  ACTION                                   */
/* -------------------------------------------------------------------------- */

/**
 * Prompts the user to select an action.
 *
 * @param {string | null} username
 * @returns {Promise<Action>}
 */
export async function selectAction(username) {
  const { action } = await inquirer.prompt([
    {
      type: 'select',
      name: 'action',
      message: 'What would you like to do?',
      choices: [
        {
          name: 'Publish New Package',
          value: ACTIONS.PUBLISH_NEW_PACKAGE,
        },
        {
          name: 'Publish New Packages',
          value: ACTIONS.PUBLISH_NEW_PACKAGES,
        },
        {
          name: 'Publish New All Packages',
          value: ACTIONS.PUBLISH_ALL_NEW_PACKAGES,
        },
        {
          name: 'Package Status',
          value: ACTIONS.PACKAGE_STATUS,
        },
        ...(username
          ? [
              {
                name: `Logout (${username})`,
                value: ACTIONS.LOGOUT,
              },
            ]
          : [
              {
                name: 'Login',
                value: ACTIONS.LOGIN,
              },
            ]),
        new inquirer.Separator(),
        {
          name: 'Exit',
          value: ACTIONS.EXIT,
        },
      ],
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
 * @param {WorkspacePackage[]} packages
 * @returns {Promise<WorkspacePackage>}
 */
export async function selectPackage(packages) {
  const { pkg } = await inquirer.prompt([
    {
      type: 'select',
      name: 'pkg',
      message: 'Select a package:',
      choices: packages.map((pkg) => ({
        name: pkg.name,
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
  const { packages: selectedPackages } = await inquirer.prompt([
    {
      type: 'checkbox',
      name: 'packages',
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

/* -------------------------------------------------------------------------- */
/*                                  VERSION                                   */
/* -------------------------------------------------------------------------- */

/**
 * Prompts the user to select a version strategy.
 *
 * @param {string} currentVersion
 * @returns {Promise<VersionType>}
 */
export async function selectVersion(currentVersion) {
  const { versionType } = await inquirer.prompt([
    {
      type: 'select',
      name: 'versionType',
      message: `Current version: ${currentVersion}`,
      choices: [
        {
          name: 'Patch',
          value: VERSION_TYPES.PATCH,
        },
        {
          name: 'Minor',
          value: VERSION_TYPES.MINOR,
        },
        {
          name: 'Major',
          value: VERSION_TYPES.MAJOR,
        },
        {
          name: 'Custom',
          value: VERSION_TYPES.CUSTOM,
        },
      ],
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
      message: 'Enter custom version:',
      default: currentVersion,
      validate(value) {
        if (!semver.valid(value)) {
          return 'Enter a valid semantic version.';
        }

        if (!semver.gt(value, currentVersion)) {
          return 'Version must be greater than the current version.';
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
 * Prompts the user to confirm publishing.
 *
 * @param {PackageMetadata} metadata
 * @param {string} version
 * @returns {Promise<boolean>}
 */
export async function confirmPublish(metadata, version) {
  const { confirmed } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'confirmed',
      message: `Publish "${metadata.packageName}" v${version}?`,
      default: true,
    },
  ]);

  return confirmed;
}
