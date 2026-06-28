import { runCommand, runInteractiveCommand } from './utils.mjs';

/* -------------------------------------------------------------------------- */
/*                               NPM ACCOUNT                                  */
/* -------------------------------------------------------------------------- */

/**
 * Returns the current npm username.
 *
 * @returns {Promise<string | null>}
 */
export async function whoami() {
  try {
    const { stdout } = await runCommand('npm', ['whoami']);

    return stdout;
  } catch {
    return null;
  }
}

/* -------------------------------------------------------------------------- */
/*                               PACKAGE INFO                                 */
/* -------------------------------------------------------------------------- */

/**
 * Returns information about a published npm package.
 *
 * @param {string} packageName
 * @returns {Promise<{
 *   published: boolean;
 *   version: string | null;
 * }>}
 */
export async function getPackageInfo(packageName) {
  try {
    const { stdout } = await runCommand('npm', ['view', packageName, 'version', '--json']);

    const version = JSON.parse(stdout);

    return {
      published: true,
      version: Array.isArray(version) ? (version.at(-1) ?? null) : version,
    };
  } catch {
    return {
      published: false,
      version: null,
    };
  }
}

/* -------------------------------------------------------------------------- */
/*                                  LOGIN                                     */
/* -------------------------------------------------------------------------- */

/**
 * Opens the npm login prompt.
 *
 * @returns {Promise<void>}
 */
export async function login() {
  await runInteractiveCommand('npm', ['login']);
}

/**
 * Opens the npm logout prompt.
 *
 * @returns {Promise<void>}
 */
export async function logout() {
  await runInteractiveCommand('npm', ['logout']);
}

/* -------------------------------------------------------------------------- */
/*                                 PUBLISH                                    */
/* -------------------------------------------------------------------------- */

/**
 * Publishes a package to npm.
 *
 * @param {string} directory
 * @returns {Promise<void>}
 */
export async function publish(directory) {
  await runInteractiveCommand('npm', ['publish', '--access', 'public'], {
    cwd: directory,
  });
}
