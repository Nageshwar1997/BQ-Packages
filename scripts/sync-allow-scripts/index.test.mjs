import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { chmod, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, it } from 'node:test';

const ENTRY = path.join(path.dirname(fileURLToPath(import.meta.url)), 'index.mjs');

/** What `npm install-scripts ls --json` printed in npm 12.2 when esbuild was blocked. */
const ESBUILD_BLOCKED = {
  allowScripts: [{ name: 'esbuild', changes: [{ key: 'esbuild@0.28.2', change: 'pending' }] }],
};

/** The stand-in for npm: takes note of its arguments, answers `install-scripts ls --json`. */
const FAKE_NPM = `
import { appendFileSync, readFileSync } from 'node:fs';

const args = process.argv.slice(2);

appendFileSync(process.env.FAKE_NPM_LOG, JSON.stringify(args) + '\\n');

if (process.env.FAKE_NPM_FAIL) {
  console.error(process.env.FAKE_NPM_FAIL);
  process.exit(1);
}

if (args.join(' ') === 'install-scripts ls --json') {
  process.stdout.write(readFileSync(process.env.FAKE_NPM_ANSWER, 'utf8'));
}
`;

describe('sync-allow-scripts', () => {
  /** @type {string} */
  let directory;

  const file = (name) => path.join(directory, name);

  /**
   * Runs the entry file in the folder of a small project, with the fake npm first in the PATH.
   *
   * @param {string[]} args
   * @param {{ blocked?: unknown; fail?: string }} [given]
   */
  const cli = async (args, { blocked = { allowScripts: [] }, fail = '' } = {}) => {
    await writeFile(file('answer.json'), JSON.stringify(blocked));

    // On Windows the variable is called `Path`: the one that exists is the one to change
    const pathKey = Object.keys(process.env).find((key) => key.toUpperCase() === 'PATH') ?? 'PATH';
    const result = spawnSync(process.execPath, [ENTRY, ...args], {
      cwd: directory,
      encoding: 'utf8',
      env: {
        ...process.env,
        [pathKey]: `${file('bin')}${path.delimiter}${process.env[pathKey] ?? ''}`,
        FAKE_NPM_LOG: file('calls.log'),
        FAKE_NPM_ANSWER: file('answer.json'),
        FAKE_NPM_FAIL: fail,
      },
    });
    const calls = (await readFile(file('calls.log'), 'utf8'))
      .split('\n')
      .filter(Boolean)
      .map((line) => JSON.parse(line).join(' '));

    return { status: result.status, output: result.stdout + result.stderr, calls };
  };

  beforeEach(async () => {
    directory = await mkdtemp(path.join(tmpdir(), 'sync-allow-scripts-'));

    await writeFile(
      file('package.json'),
      JSON.stringify({ name: 'root', allowScripts: { 'esbuild@0.27.7': true } }),
    );
    await writeFile(file('calls.log'), '');
    await writeFile(file('fake-npm.mjs'), FAKE_NPM);
    await mkdir(file('bin'));
    // `npm` is `npm.cmd` on Windows, a script elsewhere; both hand over to the same file
    await writeFile(file('bin/npm.cmd'), '@node "%~dp0\\..\\fake-npm.mjs" %*\r\n');
    await writeFile(
      file('bin/npm'),
      '#!/bin/sh\nexec node "$(dirname "$0")/../fake-npm.mjs" "$@"\n',
    );
    await chmod(file('bin/npm'), 0o755);
  });

  afterEach(async () => {
    await rm(directory, { recursive: true, force: true });
  });

  it('shows how to use it with --help, and asks npm nothing', async () => {
    for (const flag of ['--help', '-h']) {
      const { status, output, calls } = await cli([flag]);

      assert.equal(status, 0);
      assert.match(output, /Usage: npm run sync-allow-scripts/);
      assert.match(output, /--dry-run/);
      assert.deepEqual(calls, []);
    }
  });

  it('refuses an option it does not know, says how to use it, and asks npm nothing', async () => {
    const { status, output, calls } = await cli(['--force']);

    assert.equal(status, 1);
    assert.match(output, /Unknown option "--force"/);
    assert.match(output, /Usage: npm run sync-allow-scripts/);
    assert.deepEqual(calls, []);
  });

  it('says so when no install script is waiting', async () => {
    const { status, output, calls } = await cli([]);

    assert.equal(status, 0);
    assert.match(output, /No install script is waiting/);
    assert.deepEqual(calls, ['install-scripts ls --json']);
  });

  it('moves the approval of a package approved before, and runs its script', async () => {
    const { status, output, calls } = await cli([], { blocked: ESBUILD_BLOCKED });

    assert.equal(status, 0);
    assert.deepEqual(calls, [
      'install-scripts ls --json',
      'install-scripts approve esbuild',
      'rebuild esbuild',
    ]);
    assert.match(output, /moved from esbuild@0\.27\.7 to esbuild@0\.28\.2/);
    assert.doesNotMatch(output, /No install script is waiting/);
  });

  it('with --dry-run only says what it would do', async () => {
    const { status, output, calls } = await cli(['--dry-run'], { blocked: ESBUILD_BLOCKED });

    assert.equal(status, 0);
    assert.deepEqual(calls, ['install-scripts ls --json']);
    assert.match(output, /would move from esbuild@0\.27\.7 to esbuild@0\.28\.2/);
  });

  it('names a package never approved, and does not approve it', async () => {
    const { status, output, calls } = await cli([], {
      blocked: {
        allowScripts: [{ name: 'sharp', changes: [{ key: 'sharp@1.0.0', change: 'pending' }] }],
      },
    });

    assert.equal(status, 0);
    assert.deepEqual(calls, ['install-scripts ls --json']);
    assert.match(output, /npm install-scripts approve sharp/);
    assert.doesNotMatch(output, /No install script is waiting/);
  });

  it('fails, with the message of npm, when npm cannot answer (an npm without install-scripts)', async () => {
    const { status, output } = await cli([], { fail: 'Unknown command: install-scripts' });

    assert.equal(status, 1);
    assert.match(output, /Unknown command: install-scripts/);
  });
});
