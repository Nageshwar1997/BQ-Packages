import { dim, error, heading, info, success, warning } from './colors.mjs';
import { REPORT_DIVIDER_WIDTH } from './constants.mjs';

/* -------------------------------------------------------------------------- */
/*                              PRIVATE HELPERS                               */
/* -------------------------------------------------------------------------- */

/**
 * Prints a blank line.
 *
 * @returns {void}
 */
function newline() {
  report('');
}

/* -------------------------------------------------------------------------- */
/*                                  LAYOUT                                    */
/* -------------------------------------------------------------------------- */

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
 * Prints a section heading.
 *
 * @param {string} title
 * @returns {void}
 */
export function reportSection(title) {
  newline();

  report(heading(title?.trim() ?? ''));
  report(dim('─'.repeat(title.length)));
}

/**
 * Prints a divider.
 *
 * @returns {void}
 */
export function reportDivider() {
  report(dim('─'.repeat(REPORT_DIVIDER_WIDTH)));
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
  report(info(message));
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
  report(success(`✔ ${message}`));
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

/* -------------------------------------------------------------------------- */
/*                                   CLEAR                                    */
/* -------------------------------------------------------------------------- */

/**
 * Prints an error message.
 *
 * @returns {void}
 */
export function reportClear() {
  console.clear();
}
