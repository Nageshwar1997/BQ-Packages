import { ensureLoggedIn, ensureLoggedOut } from './auth.mjs';
import { ACTIONS, EXIT_CODES } from './constants.mjs';
import { getPackagesMetadata } from './metadata.mjs';
import { login, logout, whoami } from './npm.mjs';
import { selectAction, selectPackage, selectPackages } from './prompts.mjs';
import { publishAllPackages, publishNewPackage, publishPackages } from './publish.mjs';
import { republishAllPackages, republishPackage, republishPackages } from './republish.mjs';
import { validatePackage } from './validators.mjs';

/**
 * @import { PackageMetadata } from './types.mjs'
 */

/* -------------------------------------------------------------------------- */
/*                                  HELPERS                                   */
/* -------------------------------------------------------------------------- */

/**
 * Prompts the user to select a package after validating it.
 *
 * @param {(metadata: PackageMetadata) => boolean} filter
 * @param {string} emptyMessage
 * @returns {Promise<PackageMetadata>}
 */
async function getPackage(filter, emptyMessage) {
  const packages = (await getPackagesMetadata()).filter(filter);

  if (packages.length === 0) {
    throw new Error(emptyMessage);
  }

  const metadata = await selectPackage(packages);

  await validatePackage({
    packageType: metadata.packageType,
    workspaceName: metadata.workspaceName,
    directory: metadata.directory,
  });

  return metadata;
}

/**
 * Prompts the user to select multiple packages after validating them.
 *
 * @param {(metadata: PackageMetadata) => boolean} filter
 * @param {string} emptyMessage
 * @returns {Promise<PackageMetadata[]>}
 */
async function getSelectedPackages(filter, emptyMessage) {
  const packages = (await getPackagesMetadata()).filter(filter);

  if (packages.length === 0) {
    throw new Error(emptyMessage);
  }

  const selectedPackages = await selectPackages(packages);

  for (const metadata of selectedPackages) {
    await validatePackage({
      packageType: metadata.packageType,
      workspaceName: metadata.workspaceName,
      directory: metadata.directory,
    });
  }

  return selectedPackages;
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
          const metadata = await getPackage(
            (pkg) => !pkg.published,
            'No unpublished packages found.',
          );

          await publishNewPackage(metadata);
          break;
        }

        case ACTIONS.PUBLISH_NEW_PACKAGES: {
          const packages = await getSelectedPackages(
            (pkg) => !pkg.published,
            'No unpublished packages found.',
          );

          await publishPackages(packages);
          break;
        }

        case ACTIONS.PUBLISH_ALL_NEW_PACKAGES: {
          const packages = (await getPackagesMetadata()).filter((pkg) => !pkg.published);

          if (packages.length === 0) {
            throw new Error('No unpublished packages found.');
          }

          await publishAllPackages(packages);
          break;
        }

        case ACTIONS.REPUBLISH_PACKAGE: {
          const metadata = await getPackage((pkg) => pkg.published, 'No published packages found.');

          await republishPackage(metadata);
          break;
        }

        case ACTIONS.REPUBLISH_PACKAGES: {
          const packages = await getSelectedPackages(
            (pkg) => pkg.published,
            'No published packages found.',
          );

          await republishPackages(packages);
          break;
        }

        case ACTIONS.REPUBLISH_ALL_PACKAGES: {
          const packages = (await getPackagesMetadata()).filter((pkg) => pkg.published);

          if (packages.length === 0) {
            throw new Error('No published packages found.');
          }

          await republishAllPackages(packages);
          break;
        }

        case ACTIONS.PACKAGE_STATUS:
          console.log('Package status is not implemented yet.');
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
