import { COMMON_ACTIONS } from '../common/constants.mjs';

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

export const PUBLISH_CHOICES = Object.freeze([
  {
    name: 'Publish New Package',
    value: PUBLISH_ACTIONS.PUBLISH_NEW_PACKAGE,
  },
  {
    name: 'Publish New Packages',
    value: PUBLISH_ACTIONS.PUBLISH_NEW_PACKAGES,
  },
  {
    name: 'Publish All New Packages',
    value: PUBLISH_ACTIONS.PUBLISH_ALL_NEW_PACKAGES,
  },
]);
