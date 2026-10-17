import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { after, afterEach, before, beforeEach, describe, it } from 'node:test';

// The root of the repository is the folder the scripts are run from (`process.cwd()` when `paths.mjs` is
// loaded): the tests make a small repository of their own, move into it, and load the code after.
const LATEST = {
  eslint: '1.2.0',
  typescript: '7.0.0',
  zod: '4.0.0',
  react: '19.9.0',
  '@beautinique/lib': '1.2.0',
  vitest: '1.5.0',
  '@mediapipe/x': '2.0.0',
};

const FILES = {
  'package.json': {
    name: '@t/root',
    devDependencies: { eslint: '^1.0.0', typescript: '^6.0.3' },
  },
  'packages/frontend/alpha/package.json': {
    name: '@t/alpha',
    dependencies: { zod: '^3.0.0' },
    peerDependencies: { react: '^19.0.0', '@beautinique/lib': '^1.0.0' },
  },
  'packages/frontend/beta/package.json': {
    name: '@t/beta',
    dependencies: { '@mediapipe/x': '1.0.1' },
    devDependencies: { vitest: '^1.0.0' },
  },
};

const LOCKFILE = '{ "lockfileVersion": 3 }\n';

describe('updateDependencies', () => {
  /** @type {string} */
  let directory;
  /** @type {string} */
  const original = process.cwd();
  /** @type {typeof import('./update.mjs')} */
  let update;

  const read = async (relative) =>
    JSON.parse(await readFile(path.join(directory, relative), 'utf8'));
  const text = (relative) => readFile(path.join(directory, relative), 'utf8');

  /** A stand-in for `npm view <name> dist-tags.latest --json`. */
  const run = async (_command, args) => {
    const version = LATEST[args[1]];

    if (version === undefined) {
      throw new Error('npm error code E404');
    }

    return { stdout: JSON.stringify(version) };
  };

  const services = (overrides = {}) => {
    const calls = { confirm: 0, install: 0 };

    return {
      calls,
      services: {
        run,
        confirm: async () => {
          calls.confirm += 1;

          return true;
        },
        installDependencies: async () => {
          calls.install += 1;
        },
        ...overrides,
      },
    };
  };

  before(async () => {
    directory = await mkdtemp(path.join(tmpdir(), 'update-deps-'));
    process.chdir(directory);
    update = await import(`./update.mjs?cwd=${encodeURIComponent(directory)}`);
  });

  after(async () => {
    process.chdir(original);
    await rm(directory, { recursive: true, force: true });
  });

  beforeEach(async () => {
    for (const [relative, content] of Object.entries(FILES)) {
      const file = path.join(directory, relative);

      await mkdir(path.dirname(file), { recursive: true });
      // the package of `alpha` is indented with four spaces, the others with two
      await writeFile(
        file,
        `${JSON.stringify(content, null, relative.includes('alpha') ? 4 : 2)}\n`,
      );
    }

    await mkdir(path.join(directory, 'packages/frontend/not-a-package'), { recursive: true });
    await writeFile(path.join(directory, 'package-lock.json'), LOCKFILE);
  });

  afterEach(async () => {
    await rm(path.join(directory, 'packages'), { recursive: true, force: true });
  });

  it('finds the root first, then every package that has a package.json (not the folder that has none)', async () => {
    const targets = await update.findTargets();

    assert.deepEqual(
      targets.map(({ label, name }) => [label, name]),
      [
        ['(root)', '@t/root'],
        ['alpha', '@t/alpha'],
        ['beta', '@t/beta'],
      ],
    );
  });

  it('only shows the plan with --dry-run: nothing is asked, written or installed', async () => {
    const { calls, services: given } = services();

    const result = await update.updateDependencies({ dryRun: true }, given);

    assert.deepEqual(result, { updates: 4, written: false });
    assert.deepEqual(calls, { confirm: 0, install: 0 });
    assert.deepEqual(await read('package.json'), FILES['package.json']);
    assert.deepEqual(
      await read('packages/frontend/alpha/package.json'),
      FILES['packages/frontend/alpha/package.json'],
    );
  });

  it('writes nothing when the answer is no', async () => {
    const { calls, services: given } = services({ confirm: async () => false });

    const result = await update.updateDependencies({}, given);

    assert.equal(result.written, false);
    assert.equal(calls.install, 0);
    assert.deepEqual(await read('package.json'), FILES['package.json']);
  });

  it('writes the new ranges, asks once, and runs npm install once', async () => {
    const { calls, services: given } = services();

    const result = await update.updateDependencies({}, given);

    assert.deepEqual(result, { updates: 4, written: true });
    assert.deepEqual(calls, { confirm: 1, install: 1 });
    // the compiler stays, and so does the exact version
    assert.deepEqual((await read('package.json')).devDependencies, {
      eslint: '^1.2.0',
      typescript: '^6.0.3',
    });
    assert.deepEqual(await read('packages/frontend/alpha/package.json'), {
      name: '@t/alpha',
      dependencies: { zod: '^4.0.0' },
      // a package of ours (`@beautinique/...`) in a peer range moves; the peer range of react does not
      peerDependencies: { react: '^19.0.0', '@beautinique/lib': '^1.2.0' },
    });
    assert.deepEqual(await read('packages/frontend/beta/package.json'), {
      name: '@t/beta',
      dependencies: { '@mediapipe/x': '1.0.1' },
      devDependencies: { vitest: '^1.5.0' },
    });
  });

  it('keeps the indentation and the final newline of each file', async () => {
    await update.updateDependencies({ yes: true }, services().services);

    const alpha = await text('packages/frontend/alpha/package.json');
    const beta = await text('packages/frontend/beta/package.json');

    assert.match(alpha, /\n {4}"name"/);
    assert.match(beta, /\n {2}"name"/);
    assert.ok(alpha.endsWith('\n') && beta.endsWith('\n'));
  });

  it('does not ask with --yes', async () => {
    const { calls, services: given } = services();

    await update.updateDependencies({ yes: true }, given);

    assert.equal(calls.confirm, 0);
    assert.equal(calls.install, 1);
  });

  it('does not run npm install with --no-install, but writes the files', async () => {
    const { calls, services: given } = services();

    await update.updateDependencies({ yes: true, install: false }, given);

    assert.equal(calls.install, 0);
    assert.equal((await read('package.json')).devDependencies.eslint, '^1.2.0');
  });

  it('puts the package.json files and the lockfile back when npm install fails, and says why', async () => {
    const { services: given } = services({
      installDependencies: async () => {
        await writeFile(path.join(directory, 'package-lock.json'), '{ "rewritten": true }\n');

        throw new Error('npm install failed');
      },
    });

    await assert.rejects(update.updateDependencies({ yes: true }, given), /npm install failed/);

    assert.deepEqual(await read('package.json'), FILES['package.json']);
    assert.deepEqual(
      await read('packages/frontend/alpha/package.json'),
      FILES['packages/frontend/alpha/package.json'],
    );
    assert.deepEqual(
      await read('packages/frontend/beta/package.json'),
      FILES['packages/frontend/beta/package.json'],
    );
    assert.equal(await text('package-lock.json'), LOCKFILE);
  });

  it('does nothing, and says so, when every dependency is at the latest', async () => {
    const { calls, services: given } = services({
      run: async (_command, args) => ({
        stdout: JSON.stringify(
          {
            eslint: '1.0.0',
            zod: '3.0.0',
            react: '19.0.0',
            '@beautinique/lib': '1.0.0',
            vitest: '1.0.0',
          }[args[1]] ?? '1.0.0',
        ),
      }),
    });

    const result = await update.updateDependencies({}, given);

    assert.deepEqual(result, { updates: 0, written: false });
    assert.deepEqual(calls, { confirm: 0, install: 0 });
  });

  it('goes on without a dependency it could not ask npm about (offline), and updates the rest', async () => {
    const { services: given } = services({
      run: async (command, args) => {
        if (args[1] === 'vitest') {
          throw new Error('getaddrinfo ENOTFOUND registry.npmjs.org');
        }

        return run(command, args);
      },
    });

    const result = await update.updateDependencies({ yes: true }, given);

    assert.equal(result.updates, 3);
    assert.equal(
      (await read('packages/frontend/beta/package.json')).devDependencies.vitest,
      '^1.0.0',
    );
    assert.equal((await read('package.json')).devDependencies.eslint, '^1.2.0');
  });
});

describe('summarizePlans', () => {
  /** @type {typeof import('./update.mjs')} */
  let update;

  before(async () => {
    update = await import('./update.mjs?summary');
  });

  const target = (label, name) => ({ label, name });

  it('counts the updates, the packages that change and the major steps, and lists what is left on purpose', () => {
    const summary = update.summarizePlans(
      [target('(root)', 'root'), target('beta', 'beta'), target('quiet', 'quiet')],
      new Map([
        [
          'root',
          {
            updates: [
              {
                name: 'a',
                field: 'devDependencies',
                from: '^1.0.0',
                to: '^2.0.0',
                change: 'major',
                internal: false,
              },
            ],
            skipped: [
              { name: 'typescript', field: 'devDependencies', range: '^6.0.3', reason: 'excluded' },
            ],
          },
        ],
        [
          'beta',
          {
            updates: [
              {
                name: 'b',
                field: 'dependencies',
                from: '^1.0.0',
                to: '^1.1.0',
                change: 'minor',
                internal: false,
              },
              {
                name: 'c',
                field: 'dependencies',
                from: '^1.0.0',
                to: '^1.0.1',
                change: 'patch',
                internal: false,
              },
            ],
            skipped: [
              { name: 'pin', field: 'dependencies', range: '1.0.1', reason: 'pinned' },
              { name: 'react', field: 'peerDependencies', range: '^19.0.0', reason: 'peer' },
            ],
          },
        ],
        ['quiet', { updates: [], skipped: [] }],
      ]),
    );

    assert.deepEqual(summary, {
      updates: 3,
      major: 1,
      packages: 2,
      leftOnPurpose: ['pin (pinned, beta)', 'typescript (excluded, (root))'],
    });
  });
});
