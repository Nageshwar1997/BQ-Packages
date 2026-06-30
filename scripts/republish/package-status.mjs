import { heading } from '../common/colors.mjs';
import { SUMMARY_LABELS, TABLE_ALIGNMENTS } from '../common/constants.mjs';
import { PACKAGE_STATUS, PACKAGE_STATUS_LABELS } from './constants.mjs';
import { getPackagesMetadata } from './metadata.mjs';
import { reportInfo, reportSection, reportSummary, reportTable } from './reporter.mjs';

/**
 * @import { PackageMetadata } from './types.mjs'
 */

/* -------------------------------------------------------------------------- */
/*                              PRIVATE HELPERS                               */
/* -------------------------------------------------------------------------- */

/**
 * Returns a human-readable package version.
 *
 * @param {string | null | undefined} version
 * @returns {string}
 */
function formatVersion(version) {
  return version ?? '-';
}

/**
 * Returns packages sorted by workspace name.
 *
 * @param {PackageMetadata[]} packages
 * @returns {PackageMetadata[]}
 */
function sortPackages(packages) {
  return [...packages].sort((a, b) => a.workspaceName.localeCompare(b.workspaceName));
}

/**
 * Returns a human-readable package status.
 *
 * @param {PackageMetadata['status']} status
 * @returns {string}
 */
function formatStatus(status) {
  return PACKAGE_STATUS_LABELS[status] ?? status;
}

/**
 * Creates table rows.
 *
 * @param {PackageMetadata[]} packages
 * @returns {Record<string, unknown>[]}
 */
function createRows(packages) {
  return packages.map((pkg) => ({
    workspace: pkg.workspaceName,
    package: pkg.npmPackageName,
    local: formatVersion(pkg.localVersion),
    remote: formatVersion(pkg.remoteVersion),
    status: formatStatus(pkg.status),
  }));
}

/**
 * Creates summary items.
 *
 * @param {PackageMetadata[]} packages
 * @returns {readonly (readonly [string, number])[]}
 */
function createSummary(packages) {
  let published = 0;
  let unpublished = 0;
  let synced = 0;
  let updateAvailable = 0;
  let outdated = 0;

  for (const pkg of packages) {
    if (pkg.published) {
      published++;
    }

    switch (pkg.status) {
      case PACKAGE_STATUS.UNPUBLISHED:
        unpublished++;
        break;

      case PACKAGE_STATUS.SYNCED:
        synced++;
        break;

      case PACKAGE_STATUS.UPDATE_AVAILABLE:
        updateAvailable++;
        break;

      case PACKAGE_STATUS.OUTDATED:
        outdated++;
        break;
    }
  }

  return [
    [SUMMARY_LABELS.TOTAL, packages.length],
    [SUMMARY_LABELS.PUBLISHED, published],
    [SUMMARY_LABELS.UNPUBLISHED, unpublished],
    [SUMMARY_LABELS.SYNCED, synced],
    [SUMMARY_LABELS.UPDATE_AVAILABLE, updateAvailable],
    [SUMMARY_LABELS.OUTDATED, outdated],
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
  const packages = sortPackages(await getPackagesMetadata());

  reportSection('Package Status');

  if (packages.length === 0) {
    reportInfo('No workspace packages found.');

    reportSummary({ title: 'Summary', items: [[heading(SUMMARY_LABELS.TOTAL), 0]] });
    return;
  }

  reportTable({
    columns: [
      { key: 'workspace', title: 'Workspace' },
      { key: 'package', title: 'NPM Package' },
      { key: 'local', title: 'Local', align: TABLE_ALIGNMENTS.CENTER },
      { key: 'remote', title: 'Remote', align: TABLE_ALIGNMENTS.CENTER },
      { key: 'status', title: 'Status' },
    ],
    rows: createRows(packages),
  });

  reportSummary({ title: 'Summary', items: createSummary(packages) });
}
