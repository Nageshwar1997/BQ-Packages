/* -------------------------------------------------------------------------- */
/*                                    TEXT                                    */
/* -------------------------------------------------------------------------- */

/**
 * Normalizes text while preserving line breaks.
 *
 * Rules:
 *  • Removes leading and trailing whitespace
 *  • Collapses consecutive spaces and tabs into a single space
 *  • Preserves line breaks
 *
 * @param {string} value
 * @returns {string}
 */
export function normalizeText(value) {
  return value.trim().replace(/[^\S\r\n]+/g, " ");
}


/* -------------------------------------------------------------------------- */
/*                                  KEYWORDS                                  */
/* -------------------------------------------------------------------------- */

/**
 * Normalizes a comma-separated keyword string.
 *
 * @param {string} value
 * @returns {string[]}
 */
export function normalizeKeywords(value) {
  return [...new Set(
    value
      .split(",")
      .map((keyword) => normalizeText(keyword).toLowerCase())
      .filter(Boolean),
  )];
}