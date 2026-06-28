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

/**
 * Returns whether the user is logged in to npm.
 *
 * @returns {Promise<boolean>}
 */
export async function isLoggedIn() {
  return (await whoami()) !== null;
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

    return { published: true, version: JSON.parse(stdout) };
  } catch {
    return { published: false, version: null };
  }
}

/* -------------------------------------------------------------------------- */
/*                                  LOGIN                                     */
/* -------------------------------------------------------------------------- */

/**
 * Opens npm login.
 *
 * @returns {Promise<void>}
 */
export async function login() {
  await runInteractiveCommand('npm', ['login']);
}

/**
 * Opens npm logout.
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
 * Publishes a package.
 *
 * @param {string} directory
 * @returns {Promise<void>}
 */
export async function publish(directory) {
  await runInteractiveCommand('npm', ['publish'], {
    cwd: directory,
  });
}
