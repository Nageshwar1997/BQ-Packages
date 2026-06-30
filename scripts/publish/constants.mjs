import { COMMON_ACTIONS } from '../common/constants.mjs';

export const APP_NAME = 'Beautinique Package Publisher';

export const REPORT_DIVIDER_WIDTH = 80;

export const PUBLISH_ACTIONS = Object.freeze({
  PUBLISH_NEW_PACKAGE: 'publish-new-package',
  PUBLISH_NEW_PACKAGES: 'publish-new-packages',
  PUBLISH_ALL_NEW_PACKAGES: 'publish-all-new-packages',
  ...COMMON_ACTIONS,
});

export const VERSION_TYPES = Object.freeze({
  PATCH: 'patch',
  MINOR: 'minor',
  MAJOR: 'major',
  CUSTOM: 'custom',
});

export const PACKAGE_STATUS = Object.freeze({
  UNPUBLISHED: 'unpublished',
  SYNCED: 'synced',
  UPDATE_AVAILABLE: 'update-available',
  OUTDATED: 'outdated',
});

export const PACKAGE_STATUS_LABELS = Object.freeze({
  [PACKAGE_STATUS.UNPUBLISHED]: 'Unpublished',
  [PACKAGE_STATUS.SYNCED]: 'Synced',
  [PACKAGE_STATUS.UPDATE_AVAILABLE]: 'Update Available',
  [PACKAGE_STATUS.OUTDATED]: 'Outdated',
});

export const SUMMARY_LABELS = Object.freeze({
  TOTAL: 'Total Packages',
  PUBLISHED: 'Published',
  UNPUBLISHED: 'Unpublished',
  SYNCED: 'Synced',
  UPDATE_AVAILABLE: 'Update Available',
  OUTDATED: 'Outdated',
});

export const BATCH_SUMMARY_LABELS = Object.freeze({
  TOTAL: 'Total',
  SUCCESSFUL: 'Successful',
  FAILED: 'Failed',
});

export const DEPENDENCY_TYPES = Object.freeze({
  DEPENDENCY: 'dependency',
  DEV_DEPENDENCY: 'devDependency',
  PEER_DEPENDENCY: 'peerDependency',
  OPTIONAL_DEPENDENCY: 'optionalDependency',
});

export const DEPENDENCY_SCOPES = Object.freeze({
  INTERNAL: 'internal',
  EXTERNAL: 'external',
});

export const TABLE_ALIGNMENTS = Object.freeze({
  LEFT: 'left',
  CENTER: 'center',
  RIGHT: 'right',
});
