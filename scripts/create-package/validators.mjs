import { PACKAGE_NAME_REGEX } from "./constants.mjs";
import { normalizeText } from "./utils.mjs";

/* -------------------------------------------------------------------------- */
/*                                   COMMON                                   */
/* -------------------------------------------------------------------------- */

/**
 * Validates that a required field is not empty.
 *
 * @param {string} value
 * @param {string} field
 * @returns {true | string}
 */
export function validateRequired(value, field) {
  if (!normalizeText(value)) {
    return `${field} is required.`;
  }

  return true;
}

/* -------------------------------------------------------------------------- */
/*                               PACKAGE NAME                                 */
/* -------------------------------------------------------------------------- */

/**
 * Validates the package name.
 *
 * Rules:
 *  • Required
 *  • Must start with a lowercase letter
 *  • Can contain lowercase letters, numbers, and hyphens
 *
 * @param {string} value
 * @returns {true | string}
 */
export function validatePackageName(value) {
  const required = validateRequired(value, "Package name");

  if (required !== true) {
    return required;
  }

  if (!PACKAGE_NAME_REGEX.test(value)) {
    return "Package name must start with a lowercase letter and contain only lowercase letters, numbers, and hyphens.";
  }

  return true;
}


/* -------------------------------------------------------------------------- */
/*                               DESCRIPTION                                  */
/* -------------------------------------------------------------------------- */

/**
 * Validates the package description.
 *
 * Rules:
 *  • Required
 *  • Cannot be empty after normalization
 *
 * @param {string} value
 * @returns {true | string}
 */
export function validateDescription(value) {
  return validateRequired(value, "Package description");
}