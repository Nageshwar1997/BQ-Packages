import { ensureLoggedIn, ensureLoggedOut } from './auth.mjs';
import { ACTIONS, EXIT_CODES, PACKAGE_STATUS } from './constants.mjs';
import { getPackagesMetadata } from './metadata.mjs';
import { login, logout, whoami } from './npm.mjs';
import { selectAction, selectPackage } from './prompts.mjs';
import { publishNewPackage } from './publish.mjs';
import { validatePackage } from './validators.mjs';

/**
 * @import { PackageMetadata } from './types.mjs'
 */

/* -------------------------------------------------------------------------- */
/*                                  HELPERS                                   */
/* -------------------------------------------------------------------------- */

/**
 * Returns all unpublished packages.
 *
 * @returns {Promise<PackageMetadata[]>}
 */
async function getUnpublishedPackages() {
  const packages = await getPackagesMetadata();

  return packages.filter((pkg) => pkg.status === PACKAGE_STATUS.UNPUBLISHED);
}

/* -------------------------------------------------------------------------- */
/*                                   MAIN                                     */
/* -------------------------------------------------------------------------- */

/**
 * Runs the interactive CLI.
 *
 * @returns {Promise<void>}
 */
async function main() {
  while (true) {
    try {
      const username = await whoami();

      const action = await selectAction(username);

      switch (action) {
        case ACTIONS.PUBLISH_NEW_PACKAGE: {
          const packages = await getUnpublishedPackages();

          if (packages.length === 0) {
            console.log('No unpublished packages found.');
            continue;
          }

          const metadata = await selectPackage(packages);

          await validatePackage({
            packageType: metadata.packageType,
            workspaceName: metadata.workspaceName,
            directory: metadata.directory,
          });

          await publishNewPackage(metadata);

          continue;
        }

        case ACTIONS.PACKAGE_STATUS:
          console.log('Package status is not implemented yet.');
          continue;

        case ACTIONS.LOGIN:
          await ensureLoggedOut();
          await login();
          continue;

        case ACTIONS.LOGOUT:
          await ensureLoggedIn();
          await logout();
          continue;

        case ACTIONS.EXIT:
          process.exit(EXIT_CODES.SUCCESS);

        default:
          throw new Error(`Unknown action "${action}".`);
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'ExitPromptError') {
        process.exit(EXIT_CODES.SUCCESS);
      }

      console.error(error instanceof Error ? error.message : error);
    }
  }
}

await main();
