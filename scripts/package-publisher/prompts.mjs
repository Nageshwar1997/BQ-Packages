import inquirer from 'inquirer';
import semver from 'semver';
import { ACTIONS, VERSION_TYPES } from './constants.mjs';

/**
 * @import { Action, PackageMetadata, VersionType } from './types.mjs'
 */

/* -------------------------------------------------------------------------- */
/*                                  HELPERS                                   */
/* -------------------------------------------------------------------------- */

/**
 * Returns package choices.
 *
 * @param {PackageMetadata[]} packages
 * @returns {{
 *   name: string;
 *   value: PackageMetadata;
 * }[]}
 */
function getPackageChoices(packages) {
  return [...packages]
    .sort((a, b) => a.workspaceName.localeCompare(b.workspaceName))
    .map((pkg) => ({
      name: `${pkg.workspaceName} (${pkg.npmPackageName})`,
      value: pkg,
    }));
}

/* -------------------------------------------------------------------------- */
/*                                  ACTION                                    */
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
          name: 'Publish All New Packages',
          value: ACTIONS.PUBLISH_ALL_NEW_PACKAGES,
        },

        new inquirer.Separator(),

        {
          name: 'Republish Package',
          value: ACTIONS.REPUBLISH_PACKAGE,
        },
        {
          name: 'Republish Packages',
          value: ACTIONS.REPUBLISH_PACKAGES,
        },
        {
          name: 'Republish All Packages',
          value: ACTIONS.REPUBLISH_ALL_PACKAGES,
        },

        new inquirer.Separator(),

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
 * @param {PackageMetadata[]} packages
 * @returns {Promise<PackageMetadata>}
 */
export async function selectPackage(packages) {
  const { pkg } = await inquirer.prompt([
    {
      type: 'select',
      name: 'pkg',
      message: 'Select a package:',
      choices: getPackageChoices(packages),
    },
  ]);

  return pkg;
}

/**
 * Prompts the user to select multiple packages.
 *
 * @param {PackageMetadata[]} packages
 * @returns {Promise<PackageMetadata[]>}
 */
export async function selectPackages(packages) {
  const { packages: selectedPackages } = await inquirer.prompt([
    {
      type: 'checkbox',
      name: 'packages',
      message: 'Select packages:',
      choices: getPackageChoices(packages),
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
 * @returns {Promise<boolean>}
 */
export async function confirmPublish(metadata) {
  const { confirmed } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'confirmed',
      message: [
        `Publish "${metadata.npmPackageName}"?`,
        '',
        `Version : ${metadata.localVersion}`,
      ].join('\n'),
      default: true,
    },
  ]);

  return confirmed;
}

/**
 * Prompts the user to confirm publishing multiple packages.
 *
 * @param {PackageMetadata[]} packages
 * @returns {Promise<boolean>}
 */
export async function confirmPublishMany(packages) {
  const message = [
    `Publish ${packages.length} new package${packages.length === 1 ? '' : 's'}?`,
    '',
    ...packages.map((pkg) => `${pkg.workspaceName} (${pkg.npmPackageName}) v${pkg.localVersion}`),
  ].join('\n');

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

/**
 * Prompts the user to confirm republishing.
 *
 * @param {PackageMetadata} metadata
 * @param {string} version
 * @returns {Promise<boolean>}
 */
export async function confirmRepublish(metadata, version) {
  const { confirmed } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'confirmed',
      message: [
        `Republish "${metadata.npmPackageName}"?`,
        '',
        `Current Version : ${metadata.localVersion}`,
        `Next Version    : ${version}`,
      ].join('\n'),
      default: true,
    },
  ]);

  return confirmed;
}

/**
 * Prompts the user to confirm republishing multiple packages.
 *
 * @param {{
 *   metadata: PackageMetadata;
 *   version: string;
 * }[]} packages
 * @returns {Promise<boolean>}
 */
export async function confirmRepublishMany(packages) {
  const message = [
    `Republish ${packages.length} package${packages.length === 1 ? '' : 's'}?`,
    '',
    ...packages.map(
      ({ metadata, version }) =>
        `${metadata.workspaceName} (${metadata.npmPackageName}) ${metadata.localVersion} → ${version}`,
    ),
  ].join('\n');

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
