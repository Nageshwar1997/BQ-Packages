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

/**
 * Package scope used for all generated packages.
 */
export const PACKAGE_SCOPE = "@beautinique";

/* -------------------------------------------------------------------------- */
/*                            PACKAGE CONFIGURATION                           */
/* -------------------------------------------------------------------------- */

/**
 * Default package version.
 */
export const PACKAGE_VERSION = "1.0.0";

/**
 * Default package license.
 */
export const PACKAGE_LICENSE = "MIT";

/**
 * Package module type.
 */
export const PACKAGE_TYPE = "module";

/* -------------------------------------------------------------------------- */
/*                                BUILD OUTPUT                                */
/* -------------------------------------------------------------------------- */

/**
 * CommonJS entry point.
 */
export const PACKAGE_MAIN = "./dist/index.cjs";

/**
 * ECMAScript module entry point.
 */
export const PACKAGE_MODULE = "./dist/index.js";

/**
 * TypeScript declaration entry point.
 */
export const PACKAGE_TYPES = "./dist/index.d.ts";

/**
 * Files included when publishing the package.
 */
export const PACKAGE_FILES = ["dist"];

/**
 * Package export map.
 */
export const PACKAGE_EXPORTS = {
  ".": {
    types: PACKAGE_TYPES,
    import: PACKAGE_MODULE,
    require: PACKAGE_MAIN,
    default: PACKAGE_MODULE,
  },
};

/* -------------------------------------------------------------------------- */
/*                                  SCRIPTS                                   */
/* -------------------------------------------------------------------------- */

/**
 * Default package scripts.
 */
export const PACKAGE_SCRIPTS = {
  build: "tsup",
  dev: "tsup --watch",
  lint: "eslint .",
  "type-check": "tsc --noEmit",
};

/**
 * Relative path from a generated package directory to the configs directory.
 */
export const CONFIGS_DIRECTORY = "../../../configs";