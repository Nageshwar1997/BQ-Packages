import { info, success, warning } from '../common/colors.mjs';
import { findPackages } from '../common/package.mjs';
import { getPackageJsonPath, ROOT_DIRECTORY } from '../common/paths.mjs';
import { buildConfirmationMessage, confirm as askConfirmation } from '../common/prompts.mjs';
import { installWorkspaceDependencies } from '../common/package-lifecycle.mjs';
import { report, reportInfo, reportSuccess, reportWarning } from '../common/reporter.mjs';
import { parseData, pathExists, readFileByPath, writeJson } from '../common/utils.mjs';
import {
  applyDependencyUpdates,
  planDependencyUpdatesFor,
} from '../republish/dependency-update.mjs';
import {
  createLockfileSnapshot,
  createSnapshot,
  restoreLockfileSnapshot,
  restoreSnapshot,
} from '../republish/rollback.mjs';
import { buildDependencyLines } from '../republish/prompts.mjs';
import { detectJsonIndent } from '../republish/utils.mjs';

/**
 * @import { PackageJson } from '../common/types.mjs'
 * @import { DependencyUpdatePlan } from '../republish/dependency-update.mjs'
 */

/**
 * A package.json of the repository that is looked at: the root, or the one of a package.
 *
 * @typedef {{
 *   label: string;
 *   name: string;
 *   directory: string;
 *   packageJson: PackageJson;
 *   indent: string | number;
 *   trailingNewline: boolean;
 * }} UpdateTarget
 */

/**
 * @typedef {{ dryRun?: boolean; yes?: boolean; install?: boolean }} UpdateOptions
 */

/**
 * What the command needs from the outside, so a test can give it its own.
 *
 * @typedef {{
 *   run?: import('../republish/dependency-update.mjs').CommandRunner;
 *   confirm?: (message: string) => Promise<boolean>;
 *   installDependencies?: () => Promise<void>;
 * }} UpdateServices
 */

export const ROOT_LABEL = '(root)';

/* -------------------------------------------------------------------------- */
/*                                   TARGETS                                  */
/* -------------------------------------------------------------------------- */

/**
 * Reads one package.json.
 *
 * @param {string} label
 * @param {string} directory
 * @returns {Promise<UpdateTarget>}
 */
async function readTarget(label, directory) {
  const content = await readFileByPath(getPackageJsonPath(directory));
  const packageJson = parseData(content);

  return {
    label,
    name: packageJson.name,
    directory,
    packageJson,
    indent: detectJsonIndent(content),
    trailingNewline: content.endsWith('\n'),
  };
}

/**
 * Finds every package.json of the repository whose dependencies are updated: the root (its tools) and
 * each package. A folder of `packages` without a package.json is not a package, and is left out.
 *
 * @returns {Promise<UpdateTarget[]>}
 */
export async function findTargets() {
  /** @type {UpdateTarget[]} */
  const targets = [await readTarget(ROOT_LABEL, ROOT_DIRECTORY)];

  for (const { workspaceName, directory } of await findPackages()) {
    if (await pathExists(getPackageJsonPath(directory))) {
      targets.push(await readTarget(workspaceName, directory));
    }
  }

  return targets;
}

/* -------------------------------------------------------------------------- */
/*                                    PLAN                                    */
/* -------------------------------------------------------------------------- */

/**
 * What the plans come to, for the report and the confirmation.
 *
 * @param {UpdateTarget[]} targets
 * @param {Map<string, DependencyUpdatePlan>} plans
 * @returns {{
 *   updates: number;
 *   major: number;
 *   packages: number;
 *   leftOnPurpose: string[];
 * }}
 */
export function summarizePlans(targets, plans) {
  let updates = 0;
  let major = 0;
  let packages = 0;
  /** @type {Set<string>} */
  const leftOnPurpose = new Set();

  for (const { name, label } of targets) {
    const plan = plans.get(name);

    if (!plan) {
      continue;
    }

    if (plan.updates.length > 0) {
      packages += 1;
    }

    updates += plan.updates.length;
    major += plan.updates.filter(({ change }) => change === 'major').length;

    for (const { name: dependency, reason } of plan.skipped) {
      if (reason === 'excluded' || reason === 'pinned') {
        leftOnPurpose.add(`${dependency} (${reason}, ${label})`);
      }
    }
  }

  return { updates, major, packages, leftOnPurpose: [...leftOnPurpose].sort() };
}

/**
 * Writes the plans into the package.json files, each once, in the style it had (indentation, final
 * newline).
 *
 * @param {UpdateTarget[]} targets
 * @param {Map<string, DependencyUpdatePlan>} plans
 * @returns {Promise<number>} How many files were written.
 */
export async function writePlans(targets, plans) {
  let written = 0;

  for (const { name, directory, packageJson, indent, trailingNewline } of targets) {
    const updates = plans.get(name)?.updates ?? [];

    if (applyDependencyUpdates(packageJson, updates)) {
      await writeJson(getPackageJsonPath(directory), packageJson, { indent, trailingNewline });
      written += 1;
    }
  }

  return written;
}

/* -------------------------------------------------------------------------- */
/*                                   REPORT                                   */
/* -------------------------------------------------------------------------- */

/**
 * Shows what would change, package by package.
 *
 * @param {UpdateTarget[]} targets
 * @param {Map<string, DependencyUpdatePlan>} plans
 */
function reportPlans(targets, plans) {
  for (const { name, label } of targets) {
    const plan = plans.get(name);

    if (!plan || plan.updates.length === 0) {
      continue;
    }

    report('');
    report(info(label));

    for (const line of buildDependencyLines(plan, '  ')) {
      report(line);
    }
  }
}

/* -------------------------------------------------------------------------- */
/*                                  THE COMMAND                               */
/* -------------------------------------------------------------------------- */

/**
 * Moves the dependencies of every package of the repository (and of the root) to their latest
 * version, by the same rules a republish uses (`planDependencyUpdates`): the compiler, exact pins and
 * the peer ranges of other people's packages are left as they are.
 *
 * It shows the plan first. With `dryRun` that is all it does; otherwise it asks (unless `yes`), writes
 * the package.json files, and runs `npm install` (unless `install` is off). If anything fails after the
 * first file was written, the package.json files and the lockfile go back as they were.
 *
 * @param {UpdateOptions} [options]
 * @param {UpdateServices} [services]
 * @returns {Promise<{ updates: number; written: boolean }>}
 */
export async function updateDependencies(options = {}, services = {}) {
  const { dryRun = false, yes = false, install = true } = options;
  const {
    run,
    confirm = askConfirmation,
    installDependencies = installWorkspaceDependencies,
  } = services;

  const targets = await findTargets();

  reportInfo(
    `Checking the latest versions of the dependencies of ${String(targets.length)} package.json files...`,
  );

  const { plans, failures } = await planDependencyUpdatesFor(
    new Map(targets.map(({ name, packageJson }) => [name, packageJson])),
    { run },
  );

  for (const [name, message] of failures) {
    reportWarning(`Could not ask npm about "${name}" (${message}). It is left as it is.`);
  }

  const { updates, major, packages, leftOnPurpose } = summarizePlans(targets, plans);

  if (leftOnPurpose.length > 0) {
    reportInfo(`Left on purpose: ${leftOnPurpose.join(', ')}`);
  }

  if (updates === 0) {
    reportSuccess('Every dependency is already at the latest.');

    return { updates: 0, written: false };
  }

  reportPlans(targets, plans);
  report('');

  const total = `${success(String(updates))} update${updates === 1 ? '' : 's'} in ${success(String(packages))} package.json file${packages === 1 ? '' : 's'}`;
  const majorNote = major > 0 ? ` (${warning(`${String(major)} major`)})` : '';

  report(`${total}${majorNote}`);

  if (dryRun) {
    reportInfo('Dry run: nothing was written.');

    return { updates, written: false };
  }

  if (!yes) {
    const confirmed = await confirm(
      buildConfirmationMessage('Write these updates and run npm install?', [
        `${String(updates)} update${updates === 1 ? '' : 's'}${major > 0 ? `, ${String(major)} of them major` : ''}`,
      ]),
    );

    if (!confirmed) {
      reportInfo('Cancelled. Nothing was written.');

      return { updates, written: false };
    }
  }

  const snapshot = await createSnapshot(
    targets.map(({ name, directory }) => ({ npmPackageName: name, directory })),
  );
  const lockfileSnapshot = await createLockfileSnapshot();

  try {
    await writePlans(targets, plans);

    if (install) {
      await installDependencies();
    }
  } catch (error) {
    await restoreSnapshot(snapshot);
    await restoreLockfileSnapshot(lockfileSnapshot);
    reportWarning(
      'Something failed: the package.json files and the lockfile are back as they were.',
    );

    throw error;
  }

  reportSuccess(`Updated ${String(updates)} dependencies.`);
  reportInfo('Check them with: npm run typecheck, npm run lint, npm run test, npm run build');

  return { updates, written: true };
}
