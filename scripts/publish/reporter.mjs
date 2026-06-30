import { dim, error, heading, info, success, warning } from '../common/colors.mjs';
import { REPORT_DIVIDER_WIDTH } from './constants.mjs';
import { printTable } from './table.mjs';

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

  console.log(heading(title));
  console.log(dim('─'.repeat(title.length)));
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

/* -------------------------------------------------------------------------- */
/*                                   TABLE                                    */
/* -------------------------------------------------------------------------- */

/**
 * Prints a table.
 *
 * @param {{
 *   columns: import('./types.mjs').TableColumn[];
 *   rows: Record<string, unknown>[];
 * }} options
 * @returns {void}
 */
export function reportTable(options) {
  printTable(options);
}

/* -------------------------------------------------------------------------- */
/*                                  SUMMARY                                   */
/* -------------------------------------------------------------------------- */

/**
 * Prints a summary.
 *
 * @param {{
 *   title: string;
 *   items: readonly (readonly [string, string | number])[];
 * }} summary
 * @returns {void}
 */
export function reportSummary({ title, items }) {
  reportSection(title);

  const width = items.reduce((max, [label]) => Math.max(max, label.length), 0);

  for (const [label, value] of items) {
    console.log(`${heading(label.padEnd(width))} : ${value}`);
  }
}
