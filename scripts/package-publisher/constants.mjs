export const APP_NAME = 'Beautinique Package Publisher';

export const ACTIONS = {
  /* -------------------------------------------------------------------------- */
  /*                               PUBLISH NEW                                  */
  /* -------------------------------------------------------------------------- */

  PUBLISH_NEW_PACKAGE: 'publish-new-package',
  PUBLISH_NEW_PACKAGES: 'publish-new-packages',
  PUBLISH_ALL_NEW_PACKAGES: 'publish-all-new-packages',

  /* -------------------------------------------------------------------------- */
  /*                              REPUBLISH                                     */
  /* -------------------------------------------------------------------------- */

  REPUBLISH_PACKAGE: 'republish-package',
  REPUBLISH_PACKAGES: 'republish-packages',
  REPUBLISH_ALL_PACKAGES: 'republish-all-packages',

  /* -------------------------------------------------------------------------- */
  /*                                 OTHER                                      */
  /* -------------------------------------------------------------------------- */

  PACKAGE_STATUS: 'package-status',
  LOGIN: 'login',
  LOGOUT: 'logout',
  EXIT: 'exit',
};

export const VERSION_TYPES = {
  PATCH: 'patch',
  MINOR: 'minor',
  MAJOR: 'major',
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
