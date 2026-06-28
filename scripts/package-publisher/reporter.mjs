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
 * Prints an operation summary.
 *
 * @param {{
 *   title: string;
 *   successful: number;
 *   failed: number;
 * }} summary
 * @returns {void}
 */
export function reportSummary({ title, successful, failed }) {
  newline();

  console.log(title);

  console.log('-'.repeat(title.length));

  console.log(`✔ Successful : ${successful}`);
  console.log(`✖ Failed     : ${failed}`);
}
