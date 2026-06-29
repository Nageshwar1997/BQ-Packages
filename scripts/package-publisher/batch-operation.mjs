import { BATCH_SUMMARY_LABELS } from './constants.mjs';
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

  for (const item of items) {
    try {
      await operation(item);
      successful++;
    } catch (error) {
      failed++;

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
      [BATCH_SUMMARY_LABELS.TOTAL, items.length],
      [BATCH_SUMMARY_LABELS.SUCCESSFUL, successful],
      [BATCH_SUMMARY_LABELS.FAILED, failed],
    ],
  });
}
