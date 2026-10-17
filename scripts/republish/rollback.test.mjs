import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { after, before, describe, it } from 'node:test';

// The root of the repository is the folder the scripts are run from (`process.cwd()` when `paths.mjs` is
// loaded), so the test runs in a folder of its own, and loads the code after moving there.
describe('the lockfile snapshot', () => {
  /** @type {string} */
  let directory;
  /** @type {string} */
  const original = process.cwd();
  /** @type {typeof import('./rollback.mjs')} */
  let rollback;

  before(async () => {
    directory = await mkdtemp(path.join(tmpdir(), 'rollback-'));
    process.chdir(directory);
    rollback = await import(`./rollback.mjs?cwd=${encodeURIComponent(directory)}`);
  });

  after(async () => {
    process.chdir(original);
    await rm(directory, { recursive: true, force: true });
  });

  it('is nothing when the repository has no lockfile', async () => {
    assert.equal(await rollback.createLockfileSnapshot(), null);
    await rollback.restoreLockfileSnapshot(null);
  });

  it('puts the lockfile back as it was after something rewrote it', async () => {
    const lockfile = path.join(directory, 'package-lock.json');

    await writeFile(lockfile, '{ "lockfileVersion": 3, "packages": {} }\n');

    const snapshot = await rollback.createLockfileSnapshot();

    await writeFile(lockfile, '{ "rewritten": true }\n');
    await rollback.restoreLockfileSnapshot(snapshot);

    assert.equal(await readFile(lockfile, 'utf8'), '{ "lockfileVersion": 3, "packages": {} }\n');
  });
});
