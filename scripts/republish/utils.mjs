/**
 * Returns the indentation used by a JSON document.
 *
 * @param {string} content
 * @returns {string | number}
 */
export function detectJsonIndent(content) {
  const match = content.match(/\n([ \t]+)"/);

  return match?.[1] ?? 2;
}
