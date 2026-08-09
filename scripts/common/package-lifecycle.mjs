import { ROOT_DIRECTORY } from './paths.mjs';
import { reportInfo } from './reporter.mjs';
import { runInteractiveCommand } from './utils.mjs';

/**
 * @import { PublishPackageMetadata } from './types.mjs'
 */

/* -------------------------------------------------------------------------- */
/*                            WORKSPACE INSTALL                               */
/* -------------------------------------------------------------------------- */

/**
 * Installs workspace dependencies before building packages for publish.
 *
 * @returns {Promise<void>}
 */
export async function installWorkspaceDependencies() {
  reportInfo('Installing workspace dependencies...');

  await runInteractiveCommand('npm', ['install'], { cwd: ROOT_DIRECTORY });
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
