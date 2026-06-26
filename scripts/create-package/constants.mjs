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