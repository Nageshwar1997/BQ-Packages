import { ensureLoggedIn, ensureLoggedOut } from './auth.mjs';
import { ACTIONS, EXIT_CODES } from './constants.mjs';
import { getPackagesMetadata } from './metadata.mjs';
import { login, logout, whoami } from './npm.mjs';
import { selectAction, selectPackage } from './prompts.mjs';
import { publishNewPackage } from './publish.mjs';
import { republishPackage } from './republish.mjs';
import { validatePackage } from './validators.mjs';

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
          const packages = (await getPackagesMetadata()).filter((pkg) => !pkg.published);

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

        case ACTIONS.REPUBLISH_PACKAGE: {
          const packages = (await getPackagesMetadata()).filter((pkg) => pkg.published);

          if (packages.length === 0) {
            console.log('No published packages found.');
            continue;
          }

          const metadata = await selectPackage(packages);

          await validatePackage({
            packageType: metadata.packageType,
            workspaceName: metadata.workspaceName,
            directory: metadata.directory,
          });

          await republishPackage(metadata);

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
          return;

        default:
          throw new Error(`Unknown action "${action}".`);
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'ExitPromptError') {
        return;
      }

      console.error(error instanceof Error ? error.message : error);
    }
  }
}

await main();

process.exit(EXIT_CODES.SUCCESS);
