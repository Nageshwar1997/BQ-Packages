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
