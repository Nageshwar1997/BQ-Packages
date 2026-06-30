/**
 * Package scope used for all generated packages.
 */
export const PACKAGE_SCOPE = '@beautinique';

/**
 * Build artifacts to be included when publishing the package.
 */
export const BUILD_ARTIFACTS = new Set(['dist', '.tsbuildinfo']);

/**
 * Exit codes.
 */
export const EXIT_CODES = Object.freeze({ SUCCESS: 0, FAILURE: 1 });

export const COMMON_ACTIONS = Object.freeze({
  STATUS: 'status',
  LOGIN: 'login',
  LOGOUT: 'logout',
  EXIT: 'exit',
});

export const TABLE_ALIGNMENTS = Object.freeze({
  LEFT: 'left',
  CENTER: 'center',
  RIGHT: 'right',
});

export const DEPENDENCY_SCOPES = Object.freeze({
  INTERNAL: 'internal',
  EXTERNAL: 'external',
});

export const DEPENDENCY_TYPES = Object.freeze({
  DEPENDENCY: 'dependency',
  DEV_DEPENDENCY: 'devDependency',
  PEER_DEPENDENCY: 'peerDependency',
  OPTIONAL_DEPENDENCY: 'optionalDependency',
});

export const BATCH_SUMMARY_LABELS = Object.freeze({
  TOTAL: 'Total',
  SUCCESSFUL: 'Successful',
  FAILED: 'Failed',
});

export const SUMMARY_LABELS = Object.freeze({
  TOTAL: 'Total Packages',
  PUBLISHED: 'Published',
  UNPUBLISHED: 'Unpublished',
  SYNCED: 'Synced',
  UPDATE_AVAILABLE: 'Update Available',
  OUTDATED: 'Outdated',
});

export const PACKAGE_STATUS_MAP = Object.freeze({
  UNPUBLISHED: 'unpublished',
  SYNCED: 'synced',
  UPDATE_AVAILABLE: 'update-available',
  OUTDATED: 'outdated',
});

export const PACKAGE_STATUS_LABELS = Object.freeze({
  [PACKAGE_STATUS_MAP.UNPUBLISHED]: 'Unpublished',
  [PACKAGE_STATUS_MAP.SYNCED]: 'Synced',
  [PACKAGE_STATUS_MAP.UPDATE_AVAILABLE]: 'Update Available',
  [PACKAGE_STATUS_MAP.OUTDATED]: 'Outdated',
});

export const REPORT_DIVIDER_WIDTH = 80;
