import { ensureLoggedIn, ensureLoggedOut } from './auth.mjs';
import { ACTIONS } from './constants.mjs';
import { login, logout, whoami } from './npm.mjs';
import { findPackages } from './package.mjs';
import { selectAction, selectPackage } from './prompts.mjs';
import { publishNewPackage } from './publish.mjs';

/**
 * @import { WorkspacePackage } from './types.mjs'
 */

/* -------------------------------------------------------------------------- */
/*                                  HELPERS                                   */
/* -------------------------------------------------------------------------- */

/**
 * Returns all workspace packages.
 *
 * @returns {Promise<WorkspacePackage[]>}
 */
async function getPackages() {
  return findPackages();
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
          const packages = await getPackages();

          const pkg = await selectPackage(packages);

          await publishNewPackage(pkg);

          break;
        }

        case ACTIONS.PACKAGE_STATUS: {
          console.log('Package status is not implemented yet.');
          break;
        }

        case ACTIONS.LOGIN: {
          await ensureLoggedOut();
          await login();
          break;
        }

        case ACTIONS.LOGOUT: {
          await ensureLoggedIn();
          await logout();
          break;
        }

        case ACTIONS.EXIT:
          return;

        default:
          throw new Error(`Unknown action "${action}".`);
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'ExitPromptError') {
        process.exit(0);
      }

      console.error(error instanceof Error ? error.message : error);
    }
  }
}

await main();
