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
  console.log(message);
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
  console.log(`✔ ${message}`);
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
  console.warn(`⚠ ${message}`);
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
  console.error(`✖ ${message}`);
}

/* -------------------------------------------------------------------------- */
/*                                  SUMMARY                                   */
/* -------------------------------------------------------------------------- */

/**
 * Prints a publish summary.
 *
 * @param {{
 *   successful: number;
 *   failed: number;
 * }} summary
 * @returns {void}
 */
export function reportSummary({ successful, failed }) {
  console.log('');

  console.log('Summary');
  console.log('-------');

  console.log(`✔ Successful : ${successful}`);
  console.log(`✖ Failed     : ${failed}`);
}
