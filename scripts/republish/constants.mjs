import { COMMON_ACTIONS } from '../common/constants.mjs';

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

export const REPUBLISH_CHOICES = [
  {
    name: 'Republish Package',
    value: REPUBLISH_ACTIONS.REPUBLISH_PACKAGE,
  },
  {
    name: 'Republish Packages',
    value: REPUBLISH_ACTIONS.REPUBLISH_PACKAGES,
  },
  {
    name: 'Republish All Packages',
    value: REPUBLISH_ACTIONS.REPUBLISH_ALL_PACKAGES,
  },
];

export const VERSION_TYPES_CHOICES = [
  { name: 'Patch', value: VERSION_TYPES.PATCH },
  { name: 'Minor', value: VERSION_TYPES.MINOR },
  { name: 'Major', value: VERSION_TYPES.MAJOR },
  { name: 'Custom', value: VERSION_TYPES.CUSTOM },
];

export const DEPENDENCY_FIELDS = [
  'dependencies',
  'devDependencies',
  'peerDependencies',
  'optionalDependencies',
];

export const UNSUPPORTED_DEPENDENCY_VALUE_PREFIXES = ['workspace:', 'file:', 'link:', 'github:'];

/**
 * Packages a republish never moves to a newer version by itself. A major version of the compiler can
 * break every package at once, so it is raised by hand, and on purpose. Empty this list to have it
 * updated with the rest.
 */
export const DEPENDENCY_UPDATE_EXCLUDED_PACKAGES = Object.freeze(['typescript']);
