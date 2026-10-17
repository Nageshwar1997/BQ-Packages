import inquirer from 'inquirer';
import semver from 'semver';
import { description, error, heading, info, success, warning } from '../common/colors.mjs';
import { buildConfirmationMessage, confirm } from '../common/prompts.mjs';
import { getCommonChoices } from '../common/utils.mjs';
import { REPUBLISH_CHOICES, VERSION_TYPES_CHOICES } from './constants.mjs';

/**
 * @import { RepublishAction, VersionType } from './types.mjs'
 * @import { PublishPackageMetadata } from '../common/types.mjs'
 * @import { DependencyUpdatePlan } from './dependency-update.mjs'
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

const FIELD_LABELS = Object.freeze({
  dependencies: 'dep',
  devDependencies: 'dev',
  peerDependencies: 'peer',
  optionalDependencies: 'opt',
});

const CHANGE_COLORS = Object.freeze({
  major: warning,
  minor: info,
  patch: description,
  other: description,
});

/**
 * Builds the lines that say what the republish does with the dependencies of a package: each one
 * that moves to a newer version (a major step is in yellow, it is the one to look at), and the ones
 * that are left on purpose (the compiler, an exact pin).
 *
 * @param {DependencyUpdatePlan} plan
 * @param {string} [indent]
 * @returns {string[]}
 */
export function buildDependencyLines(plan, indent = '') {
  if (plan.updates.length === 0) {
    return [`${indent}${description('Dependencies    :')} ${success('all at the latest')}`];
  }

  const width = Math.max(...plan.updates.map(({ name }) => name.length));

  /** @type {string[]} */
  const lines = [
    `${indent}${description('Dependencies    :')} ${success(String(plan.updates.length))} to update`,
    ...plan.updates.map(
      ({ name, field, from, to, change }) =>
        `${indent}  ${info(name.padEnd(width))} ${description((FIELD_LABELS[field] ?? field).padEnd(4))} ${warning(from)} ${description('→')} ${success(to)} ${CHANGE_COLORS[change](`(${change})`)}`,
    ),
  ];

  const kept = [
    ...new Set(
      plan.skipped
        .filter(({ reason }) => reason === 'excluded' || reason === 'pinned')
        .map(({ name, reason }) => `${name} (${reason})`),
    ),
  ];

  if (kept.length > 0) {
    lines.push(`${indent}${description('Not updated     :')} ${kept.join(', ')}`);
  }

  return lines;
}

/**
 * Prompts the user to confirm republishing.
 *
 * @param {PublishPackageMetadata} metadata
 * @param {string} version
 * @param {DependencyUpdatePlan} [dependencyPlan]
 * @returns {Promise<boolean>}
 */
export function confirmRepublish(metadata, version, dependencyPlan) {
  return confirm(
    buildConfirmationMessage(heading(`Republish "${success(metadata.npmPackageName)}"?`), [
      `${description('Workspace       :')} ${info(metadata.workspaceName)}`,
      `${description('Current Version :')} ${warning(metadata.localVersion)}`,
      `${description('Next Version    :')} ${success(version)}`,
      ...(dependencyPlan ? buildDependencyLines(dependencyPlan) : []),
    ]),
  );
}

/**
 * Prompts the user to confirm republishing multiple packages.
 *
 * @param {{
 *   metadata: PublishPackageMetadata;
 *   version: string;
 *   dependencyPlan?: DependencyUpdatePlan;
 * }[]} packages
 * @returns {Promise<boolean>}
 */
export function confirmRepublishMany(packages) {
  return confirm(
    buildConfirmationMessage(
      heading(
        `Republish ${success(String(packages.length))} package${packages.length === 1 ? '' : 's'}?`,
      ),
      packages.flatMap(({ metadata, version, dependencyPlan }) => [
        `${info(metadata.workspaceName.padEnd(20))} ${warning(metadata.localVersion)} ${description('→')} ${success(version)}`,
        ...(dependencyPlan ? buildDependencyLines(dependencyPlan, '  ') : []),
      ]),
    ),
  );
}
