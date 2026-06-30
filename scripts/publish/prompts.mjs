import inquirer from 'inquirer';
import semver from 'semver';
import { dim, error, heading, info, success, warning } from './color.mjs';
import { PUBLISH_ACTIONS, VERSION_TYPES } from './constants.mjs';

/**
 * @import { PublishAction, PackageMetadata, VersionType } from './types.mjs'
 */

/* -------------------------------------------------------------------------- */
/*                              PRIVATE HELPERS                               */
/* -------------------------------------------------------------------------- */

/**
 * Returns package choices sorted by workspace name.
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
      name: `${pkg.workspaceName} (${pkg.npmPackageName}) v${pkg.localVersion}`,
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
 * @returns {Promise<PublishAction>}
 */
export async function selectAction(username) {
  const { action } = await inquirer.prompt([
    {
      type: 'select',
      name: 'action',
      message: heading('What would you like to do?'),
      choices: [
        {
          name: 'Publish New Package',
          value: PUBLISH_ACTIONS.PUBLISH_NEW_PACKAGE,
        },
        {
          name: 'Publish New Packages',
          value: PUBLISH_ACTIONS.PUBLISH_NEW_PACKAGES,
        },
        {
          name: 'Publish All New Packages',
          value: PUBLISH_ACTIONS.PUBLISH_ALL_NEW_PACKAGES,
        },

        new inquirer.Separator(),

        {
          name: 'Package Status',
          value: PUBLISH_ACTIONS.PACKAGE_STATUS,
        },

        ...(username
          ? [
              {
                name: `Logout (${username})`,
                value: PUBLISH_ACTIONS.LOGOUT,
              },
            ]
          : [
              {
                name: 'Login',
                value: PUBLISH_ACTIONS.LOGIN,
              },
            ]),

        new inquirer.Separator(),

        {
          name: 'Exit',
          value: PUBLISH_ACTIONS.EXIT,
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
      message: heading('Select a package:'),
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
/*                              PRIVATE HELPERS                               */
/* -------------------------------------------------------------------------- */

/**
 * Prompts the user for confirmation.
 *
 * @param {string} message
 * @returns {Promise<boolean>}
 */
async function confirm(message) {
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
 * Builds a confirmation message.
 *
 * @param {string} title
 * @param {string[]} lines
 * @returns {string}
 */
function buildConfirmationMessage(title, lines) {
  return [title, '', ...lines].join('\n');
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
        `${dim('Package :')} ${success(packageName)}`,
        `${dim('Version :')} ${warning(currentVersion)}`,
      ].join('\n'),
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
      message: [
        heading('Enter custom version'),
        '',
        `${dim('Current :')} ${warning(currentVersion)}`,
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
 * Prompts the user to confirm publishing.
 *
 * @param {PackageMetadata} metadata
 * @returns {Promise<boolean>}
 */
export function confirmPublish(metadata) {
  return confirm(
    buildConfirmationMessage(heading(`Publish "${success(metadata.npmPackageName)}"?`), [
      `${dim('Workspace :')} ${info(metadata.workspaceName)}`,
      `${dim('Version   :')} ${warning(metadata.localVersion)}`,
    ]),
  );
}

/**
 * Prompts the user to confirm publishing multiple packages.
 *
 * @param {PackageMetadata[]} packages
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
          `${info(pkg.workspaceName.padEnd(20))} ${warning(pkg.localVersion.padEnd(10))} ${dim(pkg.npmPackageName)}`,
      ),
    ),
  );
}

/**
 * Prompts the user to confirm republishing.
 *
 * @param {PackageMetadata} metadata
 * @param {string} version
 * @returns {Promise<boolean>}
 */
export function confirmRepublish(metadata, version) {
  return confirm(
    buildConfirmationMessage(heading(`Republish "${success(metadata.npmPackageName)}"?`), [
      `${dim('Workspace       :')} ${info(metadata.workspaceName)}`,
      `${dim('Current Version :')} ${warning(metadata.localVersion)}`,
      `${dim('Next Version    :')} ${success(version)}`,
    ]),
  );
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
export function confirmRepublishMany(packages) {
  return confirm(
    buildConfirmationMessage(
      heading(
        `Republish ${success(String(packages.length))} package${packages.length === 1 ? '' : 's'}?`,
      ),
      packages.map(
        ({ metadata, version }) =>
          `${info(metadata.workspaceName.padEnd(20))} ${warning(metadata.localVersion)} ${dim('→')} ${success(version)}`,
      ),
    ),
  );
}
