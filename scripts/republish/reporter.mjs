import { printTable } from './table.mjs';

/**
 * @import { TableColumn } from '../common/types.mjs'
 */

/* -------------------------------------------------------------------------- */
/*                                   TABLE                                    */
/* -------------------------------------------------------------------------- */

/**
 * Prints a table.
 *
 * @param {{
 *   columns: TableColumn[];
 *   rows: Record<string, unknown>[];
 * }} options
 * @returns {void}
 */
export function reportTable(options) {
  printTable(options);
}
