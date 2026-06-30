import { ensureLoggedIn, ensureLoggedOut } from '../common/auth.mjs';
import { EXIT_CODES } from '../common/constants.mjs';
import { CliError } from '../common/errors.mjs';
import { login, logout, whoami } from '../common/npm.mjs';
import { reportError } from '../common/reporter.mjs';
import { PUBLISH_ACTIONS } from './constants.mjs';
import { getPackage, getPackages, getSelectedPackages } from './package-selection.mjs';
import { showPackageStatus } from './package-status.mjs';
import { selectPublishAction } from './prompts.mjs';
import { publishAllPackages, publishNewPackage, publishPackages } from './publish.mjs';

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

      const action = await selectPublishAction(username);

      switch (action) {
        case PUBLISH_ACTIONS.PUBLISH_NEW_PACKAGE: {
          const metadata = await getPackage({
            filter: (pkg) => !pkg.published,
            emptyMessage: 'No unpublished packages found.',
          });

          await publishNewPackage(metadata);
          break;
        }

        case PUBLISH_ACTIONS.PUBLISH_NEW_PACKAGES: {
          const packages = await getSelectedPackages({
            filter: (pkg) => !pkg.published,
            emptyMessage: 'No unpublished packages found.',
          });

          await publishPackages(packages);
          break;
        }

        case PUBLISH_ACTIONS.PUBLISH_ALL_NEW_PACKAGES: {
          const packages = await getPackages({
            filter: (pkg) => !pkg.published,
            emptyMessage: 'No unpublished packages found.',
          });

          await publishAllPackages(packages);
          break;
        }

        case PUBLISH_ACTIONS.STATUS:
          await showPackageStatus();
          break;

        case PUBLISH_ACTIONS.LOGIN:
          await ensureLoggedOut();
          await login();
          break;

        case PUBLISH_ACTIONS.LOGOUT:
          await ensureLoggedIn();
          await logout();
          break;

        case PUBLISH_ACTIONS.EXIT:
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
