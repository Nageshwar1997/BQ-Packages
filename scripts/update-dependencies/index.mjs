import { EXIT_CODES } from '../common/constants.mjs';
import { reportError, reportInfo } from '../common/reporter.mjs';
import { exit } from '../common/utils.mjs';
import { updateDependencies } from './update.mjs';

/**
 * `npm run update-deps`: moves the dependencies of every package of the repository, and of the root,
 * to their latest version (see `updateDependencies`). The compiler (`typescript`) is left as it is.
 *
 *   --dry-run     only shows the plan, writes nothing
 *   --yes, -y     does not ask before writing
 *   --no-install  writes the package.json files but does not run `npm install`
 */

const FLAGS = new Map([
  ['--dry-run', 'dryRun'],
  ['--yes', 'yes'],
  ['-y', 'yes'],
  ['--no-install', 'noInstall'],
  ['--help', 'help'],
  ['-h', 'help'],
]);

const USAGE = [
  'Usage: npm run update-deps -- [options]',
  '',
  'Moves the dependencies of every package (and of the root) to the latest version.',
  'The compiler (typescript), exact versions and the peer ranges of other packages are left as they are.',
  '',
  'Options:',
  '  --dry-run     only show the plan, write nothing',
  '  --yes, -y     do not ask before writing',
  '  --no-install  write the package.json files, do not run npm install',
  '  --help, -h    show this',
].join('\n');

/**
 * @param {string[]} args
 * @returns {{ dryRun: boolean; yes: boolean; noInstall: boolean; help: boolean }}
 */
function parseArguments(args) {
  const options = { dryRun: false, yes: false, noInstall: false, help: false };

  for (const argument of args) {
    const key = FLAGS.get(argument);

    if (!key) {
      throw new Error(`Unknown option "${argument}".\n\n${USAGE}`);
    }

    options[key] = true;
  }

  return options;
}

try {
  const options = parseArguments(process.argv.slice(2));

  if (options.help) {
    reportInfo(USAGE);
  } else {
    await updateDependencies({
      dryRun: options.dryRun,
      yes: options.yes,
      install: !options.noInstall,
    });
  }

  exit(EXIT_CODES.SUCCESS);
} catch (error) {
  // Ctrl+C at the question is not a failure
  if (error instanceof Error && error.name === 'ExitPromptError') {
    exit(EXIT_CODES.SUCCESS);
  }

  reportError(error instanceof Error ? error.message : String(error));
  exit(EXIT_CODES.FAILURE);
}
