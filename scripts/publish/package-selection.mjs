import { ValidationError } from './errors.mjs';
import { getPackagesMetadata } from './metadata.mjs';
import { selectPackage, selectPackages } from './prompts.mjs';
import { validatePackage } from './validators.mjs';

/**
 * @import { PackageMetadata } from './types.mjs'
 */

/* -------------------------------------------------------------------------- */
/*                              PRIVATE HELPERS                               */
/* -------------------------------------------------------------------------- */

/**
 * Validates a package.
 *
 * @param {PackageMetadata} metadata
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
 * @param {(metadata: PackageMetadata) => boolean} filter
 * @param {string} emptyMessage
 * @returns {Promise<PackageMetadata[]>}
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
 * @param {PackageMetadata[]} packages
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
 *   filter: (metadata: PackageMetadata) => boolean;
 *   emptyMessage: string;
 * }} options
 * @returns {Promise<PackageMetadata>}
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
 *   filter: (metadata: PackageMetadata) => boolean;
 *   emptyMessage: string;
 * }} options
 * @returns {Promise<PackageMetadata[]>}
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
 *   filter: (metadata: PackageMetadata) => boolean;
 *   emptyMessage: string;
 * }} options
 * @returns {Promise<PackageMetadata[]>}
 */
export async function getPackages({ filter, emptyMessage }) {
  const packages = await getFilteredPackages(filter, emptyMessage);

  await validatePackages(packages);

  return packages;
}
