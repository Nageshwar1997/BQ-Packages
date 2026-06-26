import {
  PACKAGE_DESCRIPTION_MAX_LENGTH,
  PACKAGE_DESCRIPTION_MIN_LENGTH,
  PACKAGE_NAME_REGEX,
} from "./constants.mjs";
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
 *  • Minimum length: 10 characters
 *  • Maximum length: 150 characters
 *  • Must contain at least one letter or number
 *
 * @param {string} value
 * @returns {true | string}
 */
export function validateDescription(value) {
  const required = validateRequired(value, "Package description");

  if (required !== true) {
    return required;
  }

  const normalizedValue = normalizeText(value);

  if (normalizedValue.length < PACKAGE_DESCRIPTION_MIN_LENGTH) {
    return `Package description must be at least ${PACKAGE_DESCRIPTION_MIN_LENGTH} characters long.`;
  }

  if (normalizedValue.length > PACKAGE_DESCRIPTION_MAX_LENGTH) {
    return `Package description cannot exceed ${PACKAGE_DESCRIPTION_MAX_LENGTH} characters.`;
  }

  if (!/[\p{L}\p{N}]/u.test(normalizedValue)) {
    return "Package description must contain at least one letter or number.";
  }

  return true;
}
