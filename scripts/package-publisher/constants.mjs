export const APP_NAME = 'Beautinique Package Publisher';

export const ACTIONS = {
  PUBLISH_PACKAGE: 'publish-package',
  PUBLISH_PACKAGES: 'publish-packages',
  PUBLISH_ALL: 'publish-all',
  PACKAGE_STATUS: 'package-status',
  LOGIN: 'login',
  LOGOUT: 'logout',
  EXIT: 'exit',
};

export const MAIN_MENU = [
  { name: 'Publish Package', value: ACTIONS.PUBLISH_PACKAGE },
  { name: 'Publish Packages', value: ACTIONS.PUBLISH_PACKAGES },
  { name: 'Publish All Packages', value: ACTIONS.PUBLISH_ALL },
  { name: 'Package Status', value: ACTIONS.PACKAGE_STATUS },
  { name: 'Login to npm', value: ACTIONS.LOGIN },
  { name: 'Logout from npm', value: ACTIONS.LOGOUT },
  { name: 'Exit', value: ACTIONS.EXIT },
];

export const VERSION_TYPES = {
  PATCH: 'patch',
  MINOR: 'minor',
  MAJOR: 'major',
  CURRENT_VERSION: 'current-version',
  CUSTOM: 'custom',
};

export const EXIT_CODE = { SUCCESS: 0, FAILURE: 1 };

export const PACKAGE_STATUS = {
  UNPUBLISHED: 'unpublished',
  SYNCED: 'synced',
  UPDATE_AVAILABLE: 'update-available',
  OUTDATED: 'outdated',
};

export const DEPENDENCY_TYPES = {
  DEPENDENCY: 'dependency',
  DEV_DEPENDENCY: 'devDependency',
  PEER_DEPENDENCY: 'peerDependency',
  OPTIONAL_DEPENDENCY: 'optionalDependency',
};

export const DEPENDENCY_SCOPES = {
  INTERNAL: 'internal',
  EXTERNAL: 'external',
};
