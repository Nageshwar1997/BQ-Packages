import { ensureLoggedIn, ensureLoggedOut } from './auth.mjs';
import { ACTIONS, EXIT_CODES } from './constants.mjs';
import { login, logout, whoami } from './npm.mjs';
import { getPackage, getPackages, getSelectedPackages } from './package-selection.mjs';
import { showPackageStatus } from './package-status.mjs';
import { selectAction } from './prompts.mjs';
import { publishAllPackages, publishNewPackage, publishPackages } from './publish.mjs';
import { reportError } from './reporter.mjs';
import { republishAllPackages, republishPackage, republishPackages } from './republish.mjs';

/* -------------------------------------------------------------------------- */
/*                              PRIVATE HELPERS                               */
/* -------------------------------------------------------------------------- */

/**
 * Exits the process.
 *
 * @param {number} [code=EXIT_CODES.SUCCESS]
 * @returns {never}
 */
function exit(code = EXIT_CODES.SUCCESS) {
  process.exit(code);
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
          const metadata = await getPackage({
            filter: (pkg) => !pkg.published,
            emptyMessage: 'No unpublished packages found.',
          });

          await publishNewPackage(metadata);
          break;
        }

        case ACTIONS.PUBLISH_NEW_PACKAGES: {
          const packages = await getSelectedPackages({
            filter: (pkg) => !pkg.published,
            emptyMessage: 'No unpublished packages found.',
          });

          await publishPackages(packages);
          break;
        }

        case ACTIONS.PUBLISH_ALL_NEW_PACKAGES: {
          const packages = await getPackages({
            filter: (pkg) => !pkg.published,
            emptyMessage: 'No unpublished packages found.',
          });

          await publishAllPackages(packages);
          break;
        }

        case ACTIONS.REPUBLISH_PACKAGE: {
          const metadata = await getPackage({
            filter: (pkg) => pkg.published,
            emptyMessage: 'No published packages found.',
          });

          await republishPackage(metadata);
          break;
        }

        case ACTIONS.REPUBLISH_PACKAGES: {
          const packages = await getSelectedPackages({
            filter: (pkg) => pkg.published,
            emptyMessage: 'No published packages found.',
          });

          await republishPackages(packages);
          break;
        }

        case ACTIONS.REPUBLISH_ALL_PACKAGES: {
          const packages = await getPackages({
            filter: (pkg) => pkg.published,
            emptyMessage: 'No published packages found.',
          });

          await republishAllPackages(packages);
          break;
        }

        case ACTIONS.PACKAGE_STATUS:
          await showPackageStatus();
          break;

        case ACTIONS.LOGIN:
          await ensureLoggedOut();
          await login();
          break;

        case ACTIONS.LOGOUT:
          await ensureLoggedIn();
          await logout();
          break;

        case ACTIONS.EXIT:
          exit();

        default:
          throw new Error(`Unknown action "${action}".`);
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'ExitPromptError') {
        exit();
      }

      reportError(error instanceof Error ? error.message : String(error));

      const isExpectedError =
        error instanceof Error && Object.hasOwn(error, 'expected') && error.expected === true;

      if (!isExpectedError) {
        exit(EXIT_CODES.FAILURE);
      }
    }
  }
}

await main();
