import { error, heading, success } from '../common/colors.mjs';
import { BATCH_SUMMARY_LABELS } from '../common/constants.mjs';
import { reportError, reportSummary } from './reporter.mjs';

/* -------------------------------------------------------------------------- */
/*                               PUBLIC API                                   */
/* -------------------------------------------------------------------------- */

/**
 * Runs a batch operation.
 *
 * @template T
 * @param {{
 *   title: string;
 *   items: T[];
 *   operation: (item: T) => Promise<void>;
 *   getItemName?: (item: T) => string;
 *   continueOnError?: boolean;
 * }} options
 * @returns {Promise<void>}
 */
export async function runBatchOperation({
  title,
  items,
  operation,
  getItemName = () => 'Item',
  continueOnError = true,
}) {
  if (!items?.length) {
    return;
  }

  let successful = 0;
  let failed = 0;
  let firstError = null;

  for (const item of items) {
    try {
      await operation(item);
      successful++;
    } catch (error) {
      failed++;
      firstError ??= error;

      reportError(`Failed: ${getItemName(item)}`);
      reportError(error instanceof Error ? error.message : String(error));

      if (!continueOnError) {
        break;
      }
    }
  }

  reportSummary({
    title,
    items: [
      [heading(BATCH_SUMMARY_LABELS.TOTAL), items.length],
      [success(BATCH_SUMMARY_LABELS.SUCCESSFUL), successful],
      [error(BATCH_SUMMARY_LABELS.FAILED), failed],
    ],
  });

  if (!continueOnError && firstError) {
    throw firstError;
  }
}
