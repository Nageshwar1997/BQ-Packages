import { syncAllowScripts } from '../common/allow-scripts.mjs';
import { EXIT_CODES } from '../common/constants.mjs';
import { reportError, reportInfo, reportSuccess } from '../common/reporter.mjs';
import { exit } from '../common/utils.mjs';

/**
 * `npm run sync-allow-scripts`: for the install scripts npm blocked, moves the approval of a package
 * that was approved for another version to the installed one, and runs its script (see
 * `syncAllowScripts`). It is what the scripts do after their own `npm install`; this is for the
 * `npm install` / `npm update` run by hand.
 *
 *   --dry-run  only says what it would do, changes nothing
 */

const USAGE = [
  'Usage: npm run sync-allow-scripts -- [options]',
  '',
  'Looks for install scripts npm blocked (not covered by allowScripts of the root package.json).',
  'A package that was approved for another version gets its approval moved to the installed version,',
  'and its install script is run. A package that was never approved is only named: approve it yourself',
  'with: npm install-scripts approve <name>',
  '',
  'Options:',
  '  --dry-run   only say what would be done, change nothing',
  '  --help, -h  show this',
].join('\n');

/**
 * @param {string[]} args
 * @returns {{ dryRun: boolean; help: boolean }}
 */
function parseArguments(args) {
  const options = { dryRun: false, help: false };

  for (const argument of args) {
    if (argument === '--dry-run') {
      options.dryRun = true;
    } else if (argument === '--help' || argument === '-h') {
      options.help = true;
    } else {
      throw new Error(`Unknown option "${argument}".\n\n${USAGE}`);
    }
  }

  return options;
}

try {
  const { dryRun, help } = parseArguments(process.argv.slice(2));

  if (help) {
    reportInfo(USAGE);
  } else {
    const { carried, needsReview } = await syncAllowScripts({ dryRun });

    if (carried.length === 0 && needsReview.length === 0) {
      reportSuccess('No install script is waiting: allowScripts covers everything npm installed.');
    }
  }

  exit(EXIT_CODES.SUCCESS);
} catch (error) {
  reportError(error instanceof Error ? error.message : String(error));
  exit(EXIT_CODES.FAILURE);
}
