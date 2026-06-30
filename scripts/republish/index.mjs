import { EXIT_CODES } from '../common/constants.mjs';
import { ensureLoggedIn, ensureLoggedOut } from './auth.mjs';
import { REPUBLISH_ACTIONS } from './constants.mjs';
import { CliError } from './errors.mjs';
import { login, logout, whoami } from './npm.mjs';
import { getPackage, getPackages, getSelectedPackages } from './package-selection.mjs';
import { showPackageStatus } from './package-status.mjs';
import { selectAction } from './prompts.mjs';
import { reportError } from './reporter.mjs';
import { republishAllPackages, republishPackage, republishPackages } from './republish.mjs';

/* -------------------------------------------------------------------------- */
/*                              PRIVATE HELPERS                               */
/* -------------------------------------------------------------------------- */

/**
 * Returns whether the prompt was cancelled by the user.
 *
 * @param {unknown} error
 * @returns {boolean}
 */
function isPromptExit(error) {
  return error instanceof Error && error.name === 'ExitPromptError';
}

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
        case REPUBLISH_ACTIONS.REPUBLISH_PACKAGE: {
          const metadata = await getPackage({
            filter: (pkg) => pkg.published,
            emptyMessage: 'No published packages found.',
          });

          await republishPackage(metadata);
          break;
        }

        case REPUBLISH_ACTIONS.REPUBLISH_PACKAGES: {
          const packages = await getSelectedPackages({
            filter: (pkg) => pkg.published,
            emptyMessage: 'No published packages found.',
          });

          await republishPackages(packages);
          break;
        }

        case REPUBLISH_ACTIONS.REPUBLISH_ALL_PACKAGES: {
          const packages = await getPackages({
            filter: (pkg) => pkg.published,
            emptyMessage: 'No published packages found.',
          });

          await republishAllPackages(packages);
          break;
        }

        case REPUBLISH_ACTIONS.PACKAGE_STATUS:
          await showPackageStatus();
          break;

        case REPUBLISH_ACTIONS.LOGIN:
          await ensureLoggedOut();
          await login();
          break;

        case REPUBLISH_ACTIONS.LOGOUT:
          await ensureLoggedIn();
          await logout();
          break;

        case REPUBLISH_ACTIONS.EXIT:
          exit();

        default:
          throw new Error(`Unknown action "${action}".`);
      }
    } catch (error) {
      if (isPromptExit(error)) {
        exit();
      }

      reportError(error instanceof Error ? error.message : String(error));

      if (!(error instanceof CliError)) {
        exit(EXIT_CODES.FAILURE);
      }
    }
  }
}

await main();
