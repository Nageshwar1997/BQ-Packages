import { getPackageJsonPath, ROOT_DIRECTORY } from './paths.mjs';
import { reportInfo, reportWarning } from './reporter.mjs';
import { parseData, readJson, runCommand } from './utils.mjs';

/**
 * npm 12 does not run the install scripts of a dependency (`postinstall` of `esbuild`, `canvas`,
 * `msgpackr-extract`, ...) unless the root `package.json` allows them in `allowScripts`. The keys are
 * pinned to an exact version (`"esbuild@0.28.2": true`), so every new version of such a package is
 * blocked until its key is changed. This module moves the approval of a package that was approved
 * before to its new version, and leaves everything else for a person to decide.
 */

/**
 * @typedef {(command: string, args: string[], options?: { cwd?: string }) => Promise<{ stdout: string }>}
 * CommandRunner
 */

/**
 * A package whose install script npm blocked, with the keys it would need in `allowScripts`.
 *
 * @typedef {{ name: string; keys: string[] }} BlockedPackage
 */

/**
 * A blocked package that was approved for another version: the approval moves to the new one.
 *
 * @typedef {{ name: string; from: string[]; to: string[] }} CarriedApproval
 */

/**
 * @typedef {{ carried: CarriedApproval[]; needsReview: BlockedPackage[] }} AllowScriptsPlan
 */

/* -------------------------------------------------------------------------- */
/*                                    PLAN                                    */
/* -------------------------------------------------------------------------- */

/**
 * The name in a key of `allowScripts` (`esbuild@0.28.2` -> `esbuild`, `@scope/pkg@1.0.0` ->
 * `@scope/pkg`, `esbuild` -> `esbuild`).
 *
 * @param {string} key
 * @returns {string}
 */
function getKeyName(key) {
  const separator = key.lastIndexOf('@');

  return separator > 0 ? key.slice(0, separator) : key;
}

/**
 * Reads the answer of `npm install-scripts ls --json`: the packages whose scripts wait for a decision.
 *
 * @param {unknown} answer
 * @returns {BlockedPackage[]}
 */
export function parseBlockedPackages(answer) {
  const entries =
    typeof answer === 'object' && answer !== null && 'allowScripts' in answer
      ? answer.allowScripts
      : undefined;

  if (!Array.isArray(entries)) {
    return [];
  }

  /** @type {BlockedPackage[]} */
  const blocked = [];

  for (const entry of entries) {
    if (typeof entry?.name !== 'string' || !Array.isArray(entry.changes)) {
      continue;
    }

    const keys = entry.changes
      .filter(
        (/** @type {{ key?: unknown; change?: unknown }} */ { key, change }) =>
          change === 'pending' && typeof key === 'string',
      )
      .map((/** @type {{ key: string }} */ { key }) => key);

    if (keys.length > 0) {
      blocked.push({ name: entry.name, keys });
    }
  }

  return blocked;
}

/**
 * Decides, for each blocked package, whether its approval moves to the new version or a person has to
 * look at it.
 *
 * The approval moves only when `allowScripts` already says `true` for another version of the same
 * package and nothing says `false` for it. A package that was never approved is never approved here:
 * a script that is new to the project is a decision for a person.
 *
 * @param {BlockedPackage[]} blocked
 * @param {Record<string, boolean>} allowScripts The `allowScripts` of the root package.json.
 * @returns {AllowScriptsPlan}
 */
export function planAllowScriptsSync(blocked, allowScripts) {
  /** @type {CarriedApproval[]} */
  const carried = [];
  /** @type {BlockedPackage[]} */
  const needsReview = [];

  for (const entry of blocked) {
    const related = Object.entries(allowScripts).filter(([key]) => getKeyName(key) === entry.name);
    const denied = related.some(([, allowed]) => allowed === false);
    const from = related.filter(([, allowed]) => allowed === true).map(([key]) => key);

    if (from.length > 0 && !denied) {
      carried.push({ name: entry.name, from, to: entry.keys });
    } else {
      needsReview.push(entry);
    }
  }

  return { carried, needsReview };
}

/* -------------------------------------------------------------------------- */
/*                                    SYNC                                    */
/* -------------------------------------------------------------------------- */

/**
 * After `npm install`: looks for install scripts npm blocked, moves the approval of the packages that
 * were approved for another version to the installed one (`npm install-scripts approve`, which also
 * drops the old key) and runs their script (`npm rebuild`), which npm skipped. The ones never approved
 * are only named, with the command that approves them.
 *
 * With `dryRun` it only says what it would do: nothing is approved or run (`npm install-scripts
 * approve --dry-run` is not trusted for that: in npm 12.2 it still writes the package.json).
 *
 * @param {{ run?: CommandRunner; directory?: string; dryRun?: boolean }} [options]
 * @returns {Promise<AllowScriptsPlan>}
 */
export async function syncAllowScripts(options = {}) {
  const { run = runCommand, directory = ROOT_DIRECTORY, dryRun = false } = options;

  const { stdout } = await run('npm', ['install-scripts', 'ls', '--json'], { cwd: directory });
  const blocked = parseBlockedPackages(parseData(stdout));

  if (blocked.length === 0) {
    return { carried: [], needsReview: [] };
  }

  /** @type {{ allowScripts?: Record<string, boolean> }} */
  const rootPackageJson = await readJson(getPackageJsonPath(directory));
  const plan = planAllowScriptsSync(blocked, rootPackageJson.allowScripts ?? {});

  for (const { name, from, to } of plan.carried) {
    if (dryRun) {
      reportInfo(
        `allowScripts: the approval of "${name}" would move from ${from.join(', ')} to ${to.join(', ')}, and its install script would run.`,
      );

      continue;
    }

    await run('npm', ['install-scripts', 'approve', name], { cwd: directory });
    await run('npm', ['rebuild', name], { cwd: directory });

    reportInfo(
      `allowScripts: the approval of "${name}" moved from ${from.join(', ')} to ${to.join(', ')}, and its install script was run.`,
    );
  }

  for (const { name, keys } of plan.needsReview) {
    reportWarning(
      `npm blocked the install script of ${keys.join(', ')}, which was never approved here. If you trust it: npm install-scripts approve ${name}`,
    );
  }

  return plan;
}
