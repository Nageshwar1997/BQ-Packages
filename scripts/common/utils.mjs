import { JsonError } from './errors.mjs';

/**
 * Parses JSON data.
 *
 * @param {string} data
 * @returns {Promise<unknown>}
 */
export function parseData(data) {
  try {
    return JSON.parse(data);
  } catch {
    throw new JsonError(`Failed to parse JSON: ${data}`);
  }
}
