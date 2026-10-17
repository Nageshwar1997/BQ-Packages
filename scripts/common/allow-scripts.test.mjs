import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, it, mock } from 'node:test';

import { parseBlockedPackages, planAllowScriptsSync, syncAllowScripts } from './allow-scripts.mjs';

/** What `npm install-scripts ls --json` printed in npm 12.2 when esbuild was blocked. */
const ESBUILD_BLOCKED = {
  allowScripts: [{ name: 'esbuild', changes: [{ key: 'esbuild@0.28.2', change: 'pending' }] }],
};

describe('parseBlockedPackages', () => {
  it('reads the packages npm says wait for a decision', () => {
    assert.deepEqual(parseBlockedPackages(ESBUILD_BLOCKED), [
      { name: 'esbuild', keys: ['esbuild@0.28.2'] },
    ]);
  });

  it('is empty when nothing is blocked', () => {
    assert.deepEqual(parseBlockedPackages({ allowScripts: [] }), []);
  });

  it('keeps every key of a package installed in two versions', () => {
    const answer = {
      allowScripts: [
        {
          name: 'esbuild',
          changes: [
            { key: 'esbuild@0.28.2', change: 'pending' },
            { key: 'esbuild@0.27.7', change: 'pending' },
          ],
        },
      ],
    };

    assert.deepEqual(parseBlockedPackages(answer), [
      { name: 'esbuild', keys: ['esbuild@0.28.2', 'esbuild@0.27.7'] },
    ]);
  });

  it('leaves out what is not waiting (another kind of change) and what is not a package', () => {
    const answer = {
      allowScripts: [
        { name: 'a', changes: [{ key: 'a@1.0.0', change: 'approved' }] },
        { name: 'b', changes: [{ key: 'b@1.0.0', change: 'pending' }, { change: 'pending' }] },
        { changes: [{ key: 'c@1.0.0', change: 'pending' }] },
        { name: 'd' },
        null,
      ],
    };

    assert.deepEqual(parseBlockedPackages(answer), [{ name: 'b', keys: ['b@1.0.0'] }]);
  });

  it('does not break on an answer of another shape', () => {
    for (const answer of [null, undefined, 'text', 7, {}, { allowScripts: 'no' }, []]) {
      assert.deepEqual(parseBlockedPackages(answer), []);
    }
  });
});

describe('planAllowScriptsSync', () => {
  const blocked = (name, version) => ({ name, keys: [`${name}@${version}`] });

  it('moves the approval of a package that was approved for another version', () => {
    const plan = planAllowScriptsSync([blocked('esbuild', '0.28.2')], {
      'esbuild@0.27.7': true,
      'canvas@3.2.3': true,
    });

    assert.deepEqual(plan, {
      carried: [{ name: 'esbuild', from: ['esbuild@0.27.7'], to: ['esbuild@0.28.2'] }],
      needsReview: [],
    });
  });

  it('knows the name of a scoped package', () => {
    const plan = planAllowScriptsSync([blocked('@scope/tool', '2.0.0')], {
      '@scope/tool@1.0.0': true,
    });

    assert.deepEqual(plan.carried, [
      { name: '@scope/tool', from: ['@scope/tool@1.0.0'], to: ['@scope/tool@2.0.0'] },
    ]);
  });

  it('lists every old version that was approved', () => {
    const plan = planAllowScriptsSync([blocked('esbuild', '0.28.2')], {
      'esbuild@0.26.0': true,
      'esbuild@0.27.7': true,
    });

    assert.deepEqual(plan.carried[0].from, ['esbuild@0.26.0', 'esbuild@0.27.7']);
  });

  it('never approves a package that was not approved before', () => {
    const plan = planAllowScriptsSync([blocked('sharp', '1.0.0')], { 'esbuild@0.27.7': true });

    assert.deepEqual(plan, { carried: [], needsReview: [blocked('sharp', '1.0.0')] });
  });

  it('does not take a package whose name only starts like an approved one', () => {
    const plan = planAllowScriptsSync([blocked('esbuild-wasm', '1.0.0')], {
      'esbuild@0.27.7': true,
    });

    assert.deepEqual(plan.carried, []);
    assert.equal(plan.needsReview.length, 1);
  });

  it('leaves a package that was refused for a person, even if another version was approved', () => {
    const plan = planAllowScriptsSync([blocked('esbuild', '0.28.2')], {
      'esbuild@0.27.7': true,
      'esbuild@0.26.0': false,
    });

    assert.deepEqual(plan.carried, []);
    assert.equal(plan.needsReview.length, 1);
  });

  it('counts only an explicit true as an approval', () => {
    const plan = planAllowScriptsSync([blocked('esbuild', '0.28.2')], {
      'esbuild@0.27.7': 'yes',
      'esbuild@0.26.0': null,
    });

    assert.deepEqual(plan.carried, []);
    assert.equal(plan.needsReview.length, 1);
  });

  it('leaves a package that was refused by name for a person', () => {
    const plan = planAllowScriptsSync([blocked('esbuild', '0.28.2')], {
      esbuild: false,
      'esbuild@0.27.7': true,
    });

    assert.deepEqual(plan.carried, []);
    assert.equal(plan.needsReview.length, 1);
  });

  it('sorts a mix of both', () => {
    const plan = planAllowScriptsSync([blocked('esbuild', '0.28.2'), blocked('sharp', '1.0.0')], {
      'esbuild@0.27.7': true,
    });

    assert.deepEqual(
      plan.carried.map(({ name }) => name),
      ['esbuild'],
    );
    assert.deepEqual(
      plan.needsReview.map(({ name }) => name),
      ['sharp'],
    );
  });

  it('has nothing to do when nothing is blocked', () => {
    assert.deepEqual(planAllowScriptsSync([], { 'esbuild@0.27.7': true }), {
      carried: [],
      needsReview: [],
    });
  });
});

describe('syncAllowScripts', () => {
  /** @type {string} */
  let directory;
  /** @type {import('node:test').Mock<(message?: unknown) => void>} */
  let log;
  /** @type {import('node:test').Mock<(message?: unknown) => void>} */
  let warn;

  /**
   * A stand-in for npm: answers `install-scripts ls --json` with `blocked`, takes note of the rest.
   *
   * @param {unknown} blocked
   * @param {(args: string[]) => void} [onCommand]
   */
  const npm = (blocked, onCommand) => {
    /** @type {{ args: string[]; cwd?: string }[]} */
    const calls = [];

    const run = async (command, args, options) => {
      assert.equal(command, 'npm');
      calls.push({ args, cwd: options?.cwd });
      onCommand?.(args);

      return { stdout: args[1] === 'ls' ? JSON.stringify(blocked) : '' };
    };

    return { run, calls };
  };

  const writeRoot = (allowScripts) =>
    writeFile(
      path.join(directory, 'package.json'),
      JSON.stringify({ name: 'root', ...(allowScripts ? { allowScripts } : {}) }),
    );

  beforeEach(async () => {
    directory = await mkdtemp(path.join(tmpdir(), 'allow-scripts-'));
    log = mock.method(console, 'log', () => {});
    warn = mock.method(console, 'warn', () => {});
  });

  afterEach(async () => {
    mock.restoreAll();
    await rm(directory, { recursive: true, force: true });
  });

  it('does nothing when nothing is blocked (and does not even need the package.json)', async () => {
    const { run, calls } = npm({ allowScripts: [] });

    const plan = await syncAllowScripts({ run, directory });

    assert.deepEqual(plan, { carried: [], needsReview: [] });
    assert.deepEqual(
      calls.map(({ args }) => args),
      [['install-scripts', 'ls', '--json']],
    );
    assert.equal(log.mock.callCount() + warn.mock.callCount(), 0);
  });

  it('approves the new version of a package approved before, then runs its script', async () => {
    await writeRoot({ 'esbuild@0.27.7': true, 'canvas@3.2.3': true });
    const { run, calls } = npm(ESBUILD_BLOCKED);

    const plan = await syncAllowScripts({ run, directory });

    assert.deepEqual(
      calls.map(({ args }) => args),
      [
        ['install-scripts', 'ls', '--json'],
        ['install-scripts', 'approve', 'esbuild'],
        ['rebuild', 'esbuild'],
      ],
    );
    assert.ok(calls.every(({ cwd }) => cwd === directory));
    assert.equal(plan.carried.length, 1);
    assert.equal(warn.mock.callCount(), 0);
    assert.match(String(log.mock.calls[0].arguments[0]), /esbuild@0\.27\.7.*esbuild@0\.28\.2/);
  });

  it('only names a package that was never approved, with the command that approves it', async () => {
    await writeRoot({ 'esbuild@0.27.7': true });
    const { run, calls } = npm({
      allowScripts: [{ name: 'sharp', changes: [{ key: 'sharp@1.0.0', change: 'pending' }] }],
    });

    const plan = await syncAllowScripts({ run, directory });

    assert.deepEqual(
      calls.map(({ args }) => args),
      [['install-scripts', 'ls', '--json']],
    );
    assert.equal(plan.carried.length, 0);
    assert.equal(warn.mock.callCount(), 1);
    assert.match(String(warn.mock.calls[0].arguments[0]), /sharp@1\.0\.0/);
    assert.match(String(warn.mock.calls[0].arguments[0]), /npm install-scripts approve sharp/);
  });

  it('treats a root package.json without allowScripts as "nothing was approved"', async () => {
    await writeRoot(undefined);
    const { run, calls } = npm(ESBUILD_BLOCKED);

    const plan = await syncAllowScripts({ run, directory });

    assert.equal(calls.length, 1);
    assert.equal(plan.needsReview.length, 1);
  });

  it('does the approvals of several packages, each with its own script run', async () => {
    await writeRoot({ 'esbuild@0.27.7': true, 'canvas@3.2.2': true });
    const { run, calls } = npm({
      allowScripts: [
        { name: 'esbuild', changes: [{ key: 'esbuild@0.28.2', change: 'pending' }] },
        { name: 'canvas', changes: [{ key: 'canvas@3.2.3', change: 'pending' }] },
      ],
    });

    await syncAllowScripts({ run, directory });

    assert.deepEqual(
      calls.slice(1).map(({ args }) => args),
      [
        ['install-scripts', 'approve', 'esbuild'],
        ['rebuild', 'esbuild'],
        ['install-scripts', 'approve', 'canvas'],
        ['rebuild', 'canvas'],
      ],
    );
  });

  it('with dryRun only says what it would do: nothing is approved or run', async () => {
    await writeRoot({ 'esbuild@0.27.7': true });
    const { run, calls } = npm({
      allowScripts: [
        { name: 'esbuild', changes: [{ key: 'esbuild@0.28.2', change: 'pending' }] },
        { name: 'sharp', changes: [{ key: 'sharp@1.0.0', change: 'pending' }] },
      ],
    });

    const plan = await syncAllowScripts({ run, directory, dryRun: true });

    assert.deepEqual(
      calls.map(({ args }) => args),
      [['install-scripts', 'ls', '--json']],
    );
    assert.deepEqual(
      plan.carried.map(({ name }) => name),
      ['esbuild'],
    );
    assert.deepEqual(
      plan.needsReview.map(({ name }) => name),
      ['sharp'],
    );
    assert.match(String(log.mock.calls[0].arguments[0]), /would move from esbuild@0.27.7/);
    assert.equal(warn.mock.callCount(), 1);
  });

  it('does not run the script of a package whose approval failed', async () => {
    await writeRoot({ 'esbuild@0.27.7': true });
    const { run, calls } = npm(ESBUILD_BLOCKED, (args) => {
      if (args[1] === 'approve') {
        throw new Error('approve failed');
      }
    });

    await assert.rejects(syncAllowScripts({ run, directory }), /approve failed/);
    assert.equal(
      calls.some(({ args }) => args[0] === 'rebuild'),
      false,
    );
  });

  it('lets the failure of npm through (an npm without `install-scripts`)', async () => {
    const run = async () => {
      throw new Error('Unknown command: install-scripts');
    };

    await assert.rejects(syncAllowScripts({ run, directory }), /Unknown command/);
  });

  it('lets an answer that is not JSON through as an error', async () => {
    const run = async () => ({ stdout: 'not json' });

    await assert.rejects(syncAllowScripts({ run, directory }), /Failed to parse JSON/);
  });
});
