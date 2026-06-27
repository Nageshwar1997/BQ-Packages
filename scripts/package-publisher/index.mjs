import { ACTIONS } from './constants.mjs';
import { login, logout, whoami } from './npm.mjs';
import { findPackages } from './package.mjs';
import { selectAction, selectPackage, selectPackages } from './prompts.mjs';
import { publishAllPackages, publishPackage, publishPackages } from './publish.mjs';

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
        case ACTIONS.PUBLISH_PACKAGE: {
          const packages = await findPackages();

          const pkg = await selectPackage(packages);

          await publishPackage(pkg);

          break;
        }

        case ACTIONS.PUBLISH_PACKAGES: {
          const packages = await findPackages();

          const selectedPackages = await selectPackages(packages);

          await publishPackages(selectedPackages);

          break;
        }

        case ACTIONS.PUBLISH_ALL: {
          const packages = await findPackages();

          await publishAllPackages(packages);

          break;
        }

        case ACTIONS.PACKAGE_STATUS: {
          console.log('Package status is not implemented yet.');
          break;
        }

        case ACTIONS.LOGIN: {
          await login();
          break;
        }

        case ACTIONS.LOGOUT: {
          await logout();
          break;
        }

        case ACTIONS.EXIT:
          return;

        default:
          throw new Error(`Unknown action "${action}".`);
      }
    } catch (error) {
      console.error(error instanceof Error ? error.message : error);
    }
  }
}

await main();
