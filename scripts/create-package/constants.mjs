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
