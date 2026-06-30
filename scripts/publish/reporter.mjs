import { printTable } from './table.mjs';

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
