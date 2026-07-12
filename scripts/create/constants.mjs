/* -------------------------------------------------------------------------- */
/*                                  CONSTANTS                                 */
/* -------------------------------------------------------------------------- */

/**
 * Regular expression used to validate package names.
 *
 * Rules:
 *  • Must start with a lowercase letter
 *  • Can contain lowercase letters, numbers, and hyphens
 */
export const PACKAGE_NAME_REGEX = /^[a-z][a-z0-9-]*$/;

/**
 * Minimum and maximum length of package names.
 */
export const PACKAGE_DESCRIPTION_MIN_LENGTH = 10;
export const PACKAGE_DESCRIPTION_MAX_LENGTH = 150;

/**
 * Package keyword validation constraints.
 *
 * Defines the minimum and maximum:
 *  • Number of keywords allowed
 *  • Length of each individual keyword
 */
export const PACKAGE_KEYWORDS_MIN_COUNT = 1;
export const PACKAGE_KEYWORDS_MAX_COUNT = 10;

export const PACKAGE_KEYWORD_MIN_LENGTH = 2;
export const PACKAGE_KEYWORD_MAX_LENGTH = 30;

/* -------------------------------------------------------------------------- */
/*                            PACKAGE CONFIGURATION                           */
/* -------------------------------------------------------------------------- */

/**
 * Default package version.
 */
export const PACKAGE_VERSION = '1.0.0';

/**
 * Default package license.
 */
export const PACKAGE_LICENSE = 'MIT';

/**
 * Package module type.
 */
export const PACKAGE_TYPE = 'module';

/* -------------------------------------------------------------------------- */
/*                                BUILD OUTPUT                                */
/* -------------------------------------------------------------------------- */

/**
 * CommonJS entry point.
 */
export const PACKAGE_MAIN = './dist/index.cjs';

/**
 * ECMAScript module entry point.
 */
export const PACKAGE_MODULE = './dist/index.js';

/**
 * TypeScript declaration entry point.
 */
export const PACKAGE_TYPES = './dist/index.d.ts';

/**
 * Package.json export path.
 */
export const PACKAGE_JSON_EXPORT = './package.json';

/**
 * Files included when publishing the package.
 */
export const PACKAGE_FILES = ['dist'];

/**
 * Package export map.
 */
export const PACKAGE_EXPORTS = {
  '.': {
    types: PACKAGE_TYPES,
    import: PACKAGE_MODULE,
    require: PACKAGE_MAIN,
    default: PACKAGE_MODULE,
  },
  [PACKAGE_JSON_EXPORT]: PACKAGE_JSON_EXPORT,
};

/* -------------------------------------------------------------------------- */
/*                                  SCRIPTS                                   */
/* -------------------------------------------------------------------------- */

/**
 * Default package scripts.
 */
export const PACKAGE_SCRIPTS = {
  build: 'tsup',
  postbuild: 'node ../../../scripts/build-types/index.mjs',
  dev: 'tsup --watch',
  lint: 'eslint .',
  typecheck: 'tsc --noEmit',
};

/**
 * Relative path from a generated package to the shared configuration directory.
 */
export const SHARED_CONFIGS_DIRECTORY = '../../../configs';

/**
 * Package author.
 */
export const PACKAGE_AUTHOR = 'Nageshwar Pawar';

/**
 * Package repository.
 */
export const PACKAGE_REPOSITORY = {
  type: 'git',
  url: 'git+https://github.com/Nageshwar1997/BQ-Packages.git',
};

/**
 * Package bugs URL.
 */
export const PACKAGE_BUGS_URL = 'https://github.com/Nageshwar1997/BQ-Packages/issues';

/**
 * Package homepage.
 */
export const PACKAGE_HOMEPAGE = 'https://github.com/Nageshwar1997/BQ-Packages';

/**
 * Package publish access.
 */
export const PACKAGE_PUBLISH_ACCESS = 'public';

/**
 * Minimum supported Node.js version.
 */
export const PACKAGE_NODE_ENGINE = '>=24';

/**
 * Whether the package has side effects.
 */
export const PACKAGE_SIDE_EFFECTS = false;

export const PACKAGE_TEMPLATES = Object.freeze({
  SHARED: 'shared',
  BACKEND: 'backend',
  FRONTEND: 'frontend',
});

export const TEMPLATE_CHOICES = Object.freeze([
  {
    name: 'Shared',
    value: PACKAGE_TEMPLATES.SHARED,
    description: `Create a ${PACKAGE_TEMPLATES.SHARED} package`,
  },
  {
    name: 'Backend',
    value: PACKAGE_TEMPLATES.BACKEND,
    description: `Create a ${PACKAGE_TEMPLATES.BACKEND} package`,
  },
  {
    name: 'Frontend',
    value: PACKAGE_TEMPLATES.FRONTEND,
    description: `Create a ${PACKAGE_TEMPLATES.FRONTEND} package`,
  },
]);
