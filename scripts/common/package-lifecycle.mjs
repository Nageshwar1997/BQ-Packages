import { syncAllowScripts } from './allow-scripts.mjs';
import { ROOT_DIRECTORY } from './paths.mjs';
import { reportInfo, reportWarning } from './reporter.mjs';
import { runInteractiveCommand } from './utils.mjs';

/**
 * @import { PublishPackageMetadata } from './types.mjs'
 */

/* -------------------------------------------------------------------------- */
/*                            WORKSPACE INSTALL                               */
/* -------------------------------------------------------------------------- */

/**
 * What the install needs from the outside, so a test can give it its own.
 *
 * @typedef {{
 *   install?: () => Promise<void>;
 *   syncScripts?: () => Promise<unknown>;
 * }} InstallServices
 */

/**
 * Installs workspace dependencies before building packages for publish.
 *
 * npm blocks the install script of a dependency whose version is not in the root `allowScripts`, so
 * after the install the approval of a package that had one is moved to its new version (see
 * `syncAllowScripts`). That check never fails the install: if it cannot be done, it says so.
 *
 * @param {InstallServices} [services]
 * @returns {Promise<void>}
 */
export async function installWorkspaceDependencies(services = {}) {
  const {
    install = () => runInteractiveCommand('npm', ['install'], { cwd: ROOT_DIRECTORY }),
    syncScripts = syncAllowScripts,
  } = services;

  reportInfo('Installing workspace dependencies...');

  await install();

  try {
    await syncScripts();
  } catch (error) {
    reportWarning(
      `Could not check the install scripts npm blocked (${error instanceof Error ? error.message : String(error)}). Run: npm install-scripts ls`,
    );
  }
}

/* -------------------------------------------------------------------------- */
/*                              PACKAGE BUILD                                 */
/* -------------------------------------------------------------------------- */

/**
 * Builds a workspace package so npm publishes a fresh dist directory.
 *
 * @param {PublishPackageMetadata} metadata
 * @returns {Promise<void>}
 */
export async function buildWorkspacePackage(metadata) {
  reportInfo(`Building "${metadata.workspaceName}" (${metadata.npmPackageName})...`);

  await runInteractiveCommand('npm', ['run', 'build', '--workspace', metadata.npmPackageName], {
    cwd: ROOT_DIRECTORY,
  });
}
