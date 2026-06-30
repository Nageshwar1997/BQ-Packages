import { COMMON_ACTIONS } from '../common/constants.mjs';

export const APP_NAME = 'Beautinique Package Publisher';

export const REPORT_DIVIDER_WIDTH = 80;

export const REPUBLISH_ACTIONS = Object.freeze({
  REPUBLISH_PACKAGE: 'republish-package',
  REPUBLISH_PACKAGES: 'republish-packages',
  REPUBLISH_ALL_PACKAGES: 'republish-all-packages',
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
