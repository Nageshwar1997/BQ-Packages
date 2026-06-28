import { PACKAGE_STATUS } from './constants.mjs';
import { getPackagesMetadata } from './metadata.mjs';
import { reportSection, reportSummary, reportTable } from './reporter.mjs';

/**
 * @import { PackageMetadata } from './types.mjs'
 */

/* -------------------------------------------------------------------------- */
/*                              PRIVATE HELPERS                               */
/* -------------------------------------------------------------------------- */

/**
 * Creates table rows.
 *
 * @param {PackageMetadata[]} packages
 * @returns {Record<string, unknown>[]}
 */
function createRows(packages) {
  return [...packages]
    .sort((a, b) => a.workspaceName.localeCompare(b.workspaceName))
    .map((pkg) => ({
      workspace: pkg.workspaceName,
      package: pkg.npmPackageName,
      local: pkg.localVersion,
      remote: pkg.remoteVersion ?? '-',
      status: pkg.status,
    }));
}

/**
 * Creates summary items.
 *
 * @param {PackageMetadata[]} packages
 * @returns {readonly (readonly [string, number])[]}
 */
function createSummary(packages) {
  return [
    ['Total Packages', packages.length],
    ['Published', packages.filter((pkg) => pkg.published).length],
    ['Unpublished', packages.filter((pkg) => pkg.status === PACKAGE_STATUS.UNPUBLISHED).length],
    ['Synced', packages.filter((pkg) => pkg.status === PACKAGE_STATUS.SYNCED).length],
    [
      'Update Available',
      packages.filter((pkg) => pkg.status === PACKAGE_STATUS.UPDATE_AVAILABLE).length,
    ],
    ['Outdated', packages.filter((pkg) => pkg.status === PACKAGE_STATUS.OUTDATED).length],
  ];
}

/* -------------------------------------------------------------------------- */
/*                               PUBLIC API                                   */
/* -------------------------------------------------------------------------- */

/**
 * Displays the status of all workspace packages.
 *
 * @returns {Promise<void>}
 */
export async function showPackageStatus() {
  const packages = await getPackagesMetadata();

  reportSection('Package Status');

  reportTable({
    columns: [
      { key: 'workspace', title: 'Workspace' },
      { key: 'package', title: 'NPM Package' },
      { key: 'local', title: 'Local' },
      { key: 'remote', title: 'Remote' },
      { key: 'status', title: 'Status' },
    ],
    rows: createRows(packages),
  });

  reportSummary({ title: 'Summary', items: createSummary(packages) });
}
