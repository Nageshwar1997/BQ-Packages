import { ValidationError } from '../common/errors.mjs';
import { getPackagesMetadata } from '../common/metadata.mjs';
import { validatePackage } from '../common/validators.mjs';
import { selectPackage, selectPackages } from './prompts.mjs';

/**
 * @import { PublishPackageMetadata } from '../common/types.mjs'
 */

/* -------------------------------------------------------------------------- */
/*                              PRIVATE HELPERS                               */
/* -------------------------------------------------------------------------- */

/**
 * Validates a package.
 *
 * @param {PublishPackageMetadata} metadata
 * @returns {Promise<void>}
 */
async function validateMetadata(metadata) {
  await validatePackage({
    packageType: metadata.packageType,
    workspaceName: metadata.workspaceName,
    directory: metadata.directory,
  });
}

/**
 * Returns packages matching the given filter.
 *
 * @param {(metadata: PublishPackageMetadata) => boolean} filter
 * @param {string} emptyMessage
 * @returns {Promise<PublishPackageMetadata[]>}
 */
async function getFilteredPackages(filter, emptyMessage) {
  const packages = (await getPackagesMetadata()).filter(filter);

  if (packages.length === 0) {
    throw new ValidationError(emptyMessage);
  }

  return packages;
}

/**
 * Validates packages.
 *
 * @param {PublishPackageMetadata[]} packages
 * @returns {Promise<void>}
 */
async function validatePackages(packages) {
  for (const metadata of packages) {
    await validateMetadata(metadata);
  }
}

/* -------------------------------------------------------------------------- */
/*                               PUBLIC API                                   */
/* -------------------------------------------------------------------------- */

/**
 * Prompts the user to select a package.
 *
 * @param {{
 *   filter: (metadata: PublishPackageMetadata) => boolean;
 *   emptyMessage: string;
 * }} options
 * @returns {Promise<PublishPackageMetadata>}
 */
export async function getPackage({ filter, emptyMessage }) {
  const packages = await getFilteredPackages(filter, emptyMessage);

  const metadata = await selectPackage(packages);

  await validateMetadata(metadata);

  return metadata;
}

/**
 * Prompts the user to select multiple packages.
 *
 * @param {{
 *   filter: (metadata: PublishPackageMetadata) => boolean;
 *   emptyMessage: string;
 * }} options
 * @returns {Promise<PublishPackageMetadata[]>}
 */
export async function getSelectedPackages({ filter, emptyMessage }) {
  const packages = await getFilteredPackages(filter, emptyMessage);

  const selectedPackages = await selectPackages(packages);

  await validatePackages(selectedPackages);

  return selectedPackages;
}

/**
 * Returns all packages matching the given filter.
 *
 * @param {{
 *   filter: (metadata: PublishPackageMetadata) => boolean;
 *   emptyMessage: string;
 * }} options
 * @returns {Promise<PublishPackageMetadata[]>}
 */
export async function getPackages({ filter, emptyMessage }) {
  const packages = await getFilteredPackages(filter, emptyMessage);

  await validatePackages(packages);

  return packages;
}
