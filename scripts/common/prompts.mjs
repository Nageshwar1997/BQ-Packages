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
export function getPackageChoices(packages) {
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
