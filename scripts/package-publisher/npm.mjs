import semver from 'semver';
import { runCommand, runInteractiveCommand } from './utils.mjs';

/* -------------------------------------------------------------------------- */
/*                              ERROR HELPERS                                 */
/* -------------------------------------------------------------------------- */

/**
 * Returns whether the npm package was not found.
 *
 * @param {unknown} error
 * @returns {boolean}
 */
function isPackageNotFound(error) {
  return (
    error instanceof Error && (/\bE404\b/.test(error.message) || /\b404\b/.test(error.message))
  );
}

/* -------------------------------------------------------------------------- */
/*                             PUBLISH HELPERS                                */
/* -------------------------------------------------------------------------- */

/**
 * Builds the npm publish arguments.
 *
 * Automatically adds the appropriate dist-tag for prerelease versions.
 *
 * @param {string} version
 * @returns {string[]}
 */
function buildPublishArguments(version) {
  const args = ['publish', '--access', 'public'];

  const prerelease = semver.prerelease(version);

  if (prerelease?.length) {
    const [tag] = prerelease;

    if (typeof tag !== 'string') {
      throw new Error(`Invalid prerelease tag for version "${version}".`);
    }

    args.push('--tag', tag);
  }

  return args;
}

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

    return stdout || null;
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

    const parsed = JSON.parse(stdout);

    const version = Array.isArray(parsed) ? (parsed.at(-1) ?? null) : parsed;

    if (typeof version !== 'string' || !semver.valid(version)) {
      throw new Error(`Invalid version returned by npm for "${packageName}".`);
    }

    return {
      published: true,
      version,
    };
  } catch (error) {
    if (isPackageNotFound(error)) {
      return {
        published: false,
        version: null,
      };
    }

    throw error;
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
 * @param {string} version
 * @returns {Promise<void>}
 */
export async function publish(directory, version) {
  await runInteractiveCommand('npm', buildPublishArguments(version), { cwd: directory });
}
