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
