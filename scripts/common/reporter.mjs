import { dim, error, heading, info, success, warning } from './colors.mjs';

/* -------------------------------------------------------------------------- */
/*                              PRIVATE HELPERS                               */
/* -------------------------------------------------------------------------- */

/**
 * Prints a blank line.
 *
 * @returns {void}
 */
function newline() {
  console.log('');
}

/* -------------------------------------------------------------------------- */
/*                                  LAYOUT                                    */
/* -------------------------------------------------------------------------- */

/**
 * Prints a section heading.
 *
 * @param {string} title
 * @returns {void}
 */
export function reportSection(title) {
  newline();

  console.log(heading(title?.trim() ?? ''));
  console.log(dim('─'.repeat(title.length)));
}

/**
 * Prints content.
 *
 * @param {string} content
 * @returns {void}
 */
export function report(content) {
  console.log(content);
}

/**
 * Prints a divider.
 *
 * @returns {void}
 */
export function reportDivider() {
  console.log(dim('─'.repeat(REPORT_DIVIDER_WIDTH)));
}

/* -------------------------------------------------------------------------- */
/*                                   INFO                                     */
/* -------------------------------------------------------------------------- */

/**
 * Prints an informational message.
 *
 * @param {string} message
 * @returns {void}
 */
export function reportInfo(message) {
  console.log(info(message));
}

/* -------------------------------------------------------------------------- */
/*                                  SUCCESS                                   */
/* -------------------------------------------------------------------------- */

/**
 * Prints a success message.
 *
 * @param {string} message
 * @returns {void}
 */
export function reportSuccess(message) {
  console.log(success(`✔ ${message}`));
}

/* -------------------------------------------------------------------------- */
/*                                  WARNING                                   */
/* -------------------------------------------------------------------------- */

/**
 * Prints a warning message.
 *
 * @param {string} message
 * @returns {void}
 */
export function reportWarning(message) {
  console.warn(warning(`⚠ ${message}`));
}

/* -------------------------------------------------------------------------- */
/*                                   ERROR                                    */
/* -------------------------------------------------------------------------- */

/**
 * Prints an error message.
 *
 * @param {string} message
 * @returns {void}
 */
export function reportError(message) {
  console.error(error(`✖ ${message}`));
}
