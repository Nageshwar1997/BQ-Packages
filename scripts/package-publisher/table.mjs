import { dim, heading } from './color.mjs';
import { TABLE_ALIGNMENTS } from './constants.mjs';

/**
 * @import { TableAlignment, TableColumn } from './types.mjs'
 */

const COLUMN_SEPARATOR = '  ';
const DEFAULT_ALIGNMENT = TABLE_ALIGNMENTS.LEFT;

/* -------------------------------------------------------------------------- */
/*                              PRIVATE HELPERS                               */
/* -------------------------------------------------------------------------- */

/**
 * Pads a value.
 *
 * @param {string} value
 * @param {number} width
 * @param {TableAlignment} align
 * @returns {string}
 */
function pad(value, width, align) {
  switch (align) {
    case TABLE_ALIGNMENTS.RIGHT:
      return value.padStart(width);

    case TABLE_ALIGNMENTS.CENTER: {
      const totalPadding = Math.max(width - value.length, 0);
      const leftPadding = Math.floor(totalPadding / 2);
      const rightPadding = totalPadding - leftPadding;

      return `${' '.repeat(leftPadding)}${value}${' '.repeat(rightPadding)}`;
    }

    case TABLE_ALIGNMENTS.LEFT:
    default:
      return value.padEnd(width);
  }
}

/**
 * Returns the width of each column.
 *
 * @param {TableColumn[]} columns
 * @param {Record<string, unknown>[]} rows
 * @returns {number[]}
 */
function getColumnWidths(columns, rows) {
  return columns.map(({ key, title }) =>
    Math.max(title.length, ...rows.map((row) => String(row[key] ?? '').length)),
  );
}

/**
 * Formats values.
 *
 * @param {TableColumn[]} columns
 * @param {number[]} widths
 * @param {Record<string, unknown>} values
 * @returns {string}
 */
function formatValues(columns, widths, values) {
  return columns
    .map((column, index) =>
      pad(String(values[column.key] ?? ''), widths[index], column.align ?? DEFAULT_ALIGNMENT),
    )
    .join(COLUMN_SEPARATOR);
}

/**
 * Returns the table header.
 *
 * @param {TableColumn[]} columns
 * @param {number[]} widths
 * @returns {string}
 */
function formatHeader(columns, widths) {
  return heading(
    formatValues(
      columns,
      widths,
      Object.fromEntries(columns.map((column) => [column.key, column.title])),
    ),
  );
}

/**
 * Returns the separator row.
 *
 * @param {number[]} widths
 * @returns {string}
 */
function formatSeparator(widths) {
  return dim(widths.map((width) => '─'.repeat(width)).join(COLUMN_SEPARATOR));
}

/* -------------------------------------------------------------------------- */
/*                               PUBLIC API                                   */
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
export function printTable({ columns, rows }) {
  if (columns.length === 0) {
    return;
  }

  const widths = getColumnWidths(columns, rows);

  console.log(formatHeader(columns, widths));
  console.log(formatSeparator(widths));

  for (const row of rows) {
    console.log(formatValues(columns, widths, row));
  }
}
