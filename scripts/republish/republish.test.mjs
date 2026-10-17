import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { after, afterEach, before, beforeEach, describe, it, mock } from 'node:test';

import { buildDependencyLines } from './prompts.mjs';
import { buildDependencyUpdatePlans, updatePackageJsonForRelease } from './republish.mjs';

/** Strips the colours of a terminal line. */
// eslint-disable-next-line no-control-regex
const plain = (line) => line.replaceAll(/\u001B\[[0-9;]*m/g, '');

describe('updatePackageJsonForRelease', () => {
  /** @type {string} */
  let directory;

  before(async () => {
    directory = await mkdtemp(path.join(tmpdir(), 'republish-'));
  });

  after(async () => {
    await rm(directory, { recursive: true, force: true });
  });

  const entryFor = (nextVersion) => ({
    metadata: { directory, npmPackageName: '@beautinique/frontend-tryon' },
    currentVersion: '1.0.0',
    nextVersion,
    releaseType: 'patch',
  });

  const writePackageJson = (packageJson) =>
    writeFile(path.join(directory, 'package.json'), `${JSON.stringify(packageJson, null, 4)}\n`);

  const readPackageJson = async () =>
    JSON.parse(await readFile(path.join(directory, 'package.json'), 'utf8'));

  it('writes the new version, the new ranges of what the republish moves, and nothing else', async () => {
    await writePackageJson({
      name: '@beautinique/frontend-tryon',
      version: '1.0.0',
      description: 'untouched',
      dependencies: { zod: '^4.6.5', '@mediapipe/tasks-vision': '1.0.1' },
      devDependencies: { typescript: '^6.0.3', vitest: '^5.0.3' },
      peerDependencies: {
        react: '^19.0.0',
        '@beautinique/frontend-components': '^1.0.9',
      },
    });

    const dependencyPlan = {
      updates: [
        {
          name: 'zod',
          field: 'dependencies',
          from: '^4.6.5',
          to: '^4.6.7',
          change: 'patch',
          internal: false,
        },
        {
          name: 'vitest',
          field: 'devDependencies',
          from: '^5.0.3',
          to: '^5.0.5',
          change: 'patch',
          internal: false,
        },
        {
          name: '@beautinique/frontend-components',
          field: 'peerDependencies',
          from: '^1.0.9',
          to: '^1.0.10',
          change: 'patch',
          internal: true,
        },
      ],
      skipped: [],
    };

    await updatePackageJsonForRelease(
      entryFor('1.0.1'),
      new Map([['@beautinique/frontend-tryon', entryFor('1.0.1')]]),
      new Map([['@beautinique/frontend-tryon', dependencyPlan]]),
    );

    assert.deepEqual(await readPackageJson(), {
      name: '@beautinique/frontend-tryon',
      version: '1.0.1',
      description: 'untouched',
      dependencies: { zod: '^4.6.7', '@mediapipe/tasks-vision': '1.0.1' },
      devDependencies: { typescript: '^6.0.3', vitest: '^5.0.5' },
      peerDependencies: {
        react: '^19.0.0',
        '@beautinique/frontend-components': '^1.0.10',
      },
    });
  });

  it('keeps the indentation and the final newline of the file', async () => {
    await updatePackageJsonForRelease(
      entryFor('1.0.2'),
      new Map([['@beautinique/frontend-tryon', entryFor('1.0.2')]]),
      new Map(),
    );

    const text = await readFile(path.join(directory, 'package.json'), 'utf8');

    assert.match(text, /\n {4}"name"/);
    assert.ok(text.endsWith('\n'));
  });

  it('gives a package of the same release the version it is released with, and does not look it up', async () => {
    await writePackageJson({
      name: '@beautinique/frontend-tryon',
      version: '1.0.0',
      peerDependencies: { '@beautinique/frontend-components': '^1.0.9' },
    });

    const releasePlan = new Map([
      ['@beautinique/frontend-tryon', entryFor('1.0.1')],
      [
        '@beautinique/frontend-components',
        {
          ...entryFor('1.0.11'),
          metadata: { directory, npmPackageName: '@beautinique/frontend-components' },
        },
      ],
    ]);

    await updatePackageJsonForRelease(entryFor('1.0.1'), releasePlan, new Map());

    assert.equal(
      (await readPackageJson()).peerDependencies['@beautinique/frontend-components'],
      '^1.0.11',
    );
  });
});

describe('buildDependencyLines', () => {
  it('says that everything is at the latest when there is nothing to update', () => {
    const lines = buildDependencyLines({ updates: [], skipped: [] }).map(plain);

    assert.deepEqual(lines, ['Dependencies    : all at the latest']);
  });

  it('lists each update with its old and new range and the size of the step', () => {
    const lines = buildDependencyLines({
      updates: [
        {
          name: 'ioredis',
          field: 'dependencies',
          from: '^5.11.1',
          to: '^6.0.0',
          change: 'major',
          internal: false,
        },
        {
          name: '@beautinique/frontend-components',
          field: 'peerDependencies',
          from: '^1.0.9',
          to: '^1.0.10',
          change: 'patch',
          internal: true,
        },
      ],
      skipped: [],
    }).map(plain);

    assert.equal(lines[0], 'Dependencies    : 2 to update');
    assert.match(lines[1], /ioredis +dep +\^5\.11\.1 → \^6\.0\.0 \(major\)/);
    assert.match(
      lines[2],
      /@beautinique\/frontend-components peer +\^1\.0\.9 → \^1\.0\.10 \(patch\)/,
    );
  });

  it('says what is left on purpose (the compiler, an exact pin) and nothing about the rest', () => {
    const lines = buildDependencyLines({
      updates: [
        {
          name: 'zod',
          field: 'dependencies',
          from: '^4.6.5',
          to: '^4.6.7',
          change: 'patch',
          internal: false,
        },
      ],
      skipped: [
        { name: 'typescript', field: 'devDependencies', range: '^6.0.3', reason: 'excluded' },
        {
          name: '@mediapipe/tasks-vision',
          field: 'dependencies',
          range: '1.0.1',
          reason: 'pinned',
        },
        { name: 'react', field: 'peerDependencies', range: '^19.0.0', reason: 'peer' },
        { name: 'typescript', field: 'peerDependencies', range: '^6.0.0', reason: 'excluded' },
      ],
    }).map(plain);

    assert.equal(
      lines.at(-1),
      'Not updated     : typescript (excluded), @mediapipe/tasks-vision (pinned)',
    );
  });

  it('indents the lines under the package they belong to', () => {
    const lines = buildDependencyLines({ updates: [], skipped: [] }, '  ').map(plain);

    assert.ok(lines[0]?.startsWith('  Dependencies'));
  });
});

describe('buildDependencyUpdatePlans: the check of the packages of the repository', () => {
  const TRYON = '@beautinique/frontend-tryon';
  const COMPONENTS = '@beautinique/frontend-components';

  /** @type {string} */
  let root;

  const folder = (name) => path.join(root, name);
  const writePackage = (name, packageJson) =>
    writeFile(path.join(folder(name), 'package.json'), JSON.stringify(packageJson, null, 2));

  const entry = (name, npmPackageName, nextVersion) => [
    npmPackageName,
    {
      metadata: { directory: folder(name), npmPackageName },
      currentVersion: '1.0.0',
      nextVersion,
      releaseType: 'patch',
    },
  ];

  /** A stand-in for npm: what is the latest, and which versions exist, of each package. */
  const npm = ({ versions, fail } = {}) => {
    /** @type {string[]} */
    const asked = [];

    const run = async (_command, args) => {
      const [, name, field] = args;

      asked.push(`${field}:${name}`);

      if (fail?.includes(name) && field === 'versions') {
        throw new Error('ETIMEDOUT');
      }

      const list = versions?.[name];

      if (list === undefined) {
        throw new Error('npm error code E404');
      }

      return { stdout: JSON.stringify(field === 'versions' ? list : list.at(-1)) };
    };

    return { run, asked };
  };

  before(async () => {
    root = await mkdtemp(path.join(tmpdir(), 'republish-check-'));
  });

  after(async () => {
    await rm(root, { recursive: true, force: true });
  });

  beforeEach(async () => {
    mock.method(console, 'log', () => {});
    mock.method(console, 'warn', () => {});
    await mkdir(folder('tryon'), { recursive: true });
    await mkdir(folder('components'), { recursive: true });
  });

  afterEach(() => {
    mock.restoreAll();
  });

  it('stops a republish whose package would need a version of another package that is not on npm', async () => {
    const original = {
      name: TRYON,
      version: '1.0.0',
      peerDependencies: { [COMPONENTS]: '^1.0.6' },
    };

    await writePackage('tryon', original);

    const { run } = npm({ versions: { [COMPONENTS]: ['1.0.4', '1.0.5'] } });

    await assert.rejects(
      buildDependencyUpdatePlans(new Map([entry('tryon', TRYON, '1.0.1')]), { run }),
      (error) => {
        assert.match(error.message, /Not republished/);
        assert.match(
          error.message,
          /peerDependencies: @beautinique\/frontend-components \^1\.0\.6/,
        );
        assert.match(error.message, /the latest on npm is 1\.0\.5/);

        return true;
      },
    );
    // nothing was written
    assert.deepEqual(
      JSON.parse(await readFile(path.join(folder('tryon'), 'package.json'), 'utf8')),
      original,
    );
  });

  it('lets it through when the package it needs is in the same release, and does not ask npm about it', async () => {
    await writePackage('tryon', {
      name: TRYON,
      version: '1.0.0',
      peerDependencies: { [COMPONENTS]: '^1.0.6' },
    });
    await writePackage('components', { name: COMPONENTS, version: '1.0.6' });

    const { run, asked } = npm({ versions: { [COMPONENTS]: ['1.0.5'] } });

    const plans = await buildDependencyUpdatePlans(
      new Map([entry('tryon', TRYON, '1.0.1'), entry('components', COMPONENTS, '1.0.7')]),
      { run },
    );

    assert.deepEqual([...plans.keys()], [TRYON, COMPONENTS]);
    assert.equal(
      asked.some((question) => question.startsWith('versions:')),
      false,
    );
  });

  it('checks the ranges as they are about to be written, not the ones in the file now', async () => {
    // the file says ^1.0.0, which a release of components as 2.0.0 does not fit; the republish writes ^2.0.0
    await writePackage('tryon', {
      name: TRYON,
      version: '1.0.0',
      dependencies: { [COMPONENTS]: '^1.0.0' },
    });
    await writePackage('components', { name: COMPONENTS, version: '1.0.0' });

    const { run } = npm();

    await buildDependencyUpdatePlans(
      new Map([entry('tryon', TRYON, '1.0.1'), entry('components', COMPONENTS, '2.0.0')]),
      { run },
    );
  });

  it('lets a republish through when the version it needs is on npm', async () => {
    await writePackage('tryon', {
      name: TRYON,
      version: '1.0.0',
      peerDependencies: { [COMPONENTS]: '^1.0.4' },
    });

    const { run } = npm({ versions: { [COMPONENTS]: ['1.0.4', '1.0.5'] } });

    const plans = await buildDependencyUpdatePlans(new Map([entry('tryon', TRYON, '1.0.1')]), {
      run,
    });

    // the republish also moves the range to the latest on npm
    assert.deepEqual(
      plans.get(TRYON)?.updates.map(({ name, to }) => [name, to]),
      [[COMPONENTS, '^1.0.5']],
    );
  });

  it('stops when npm cannot say what versions exist', async () => {
    await writePackage('tryon', {
      name: TRYON,
      version: '1.0.0',
      peerDependencies: { [COMPONENTS]: '^1.0.4' },
    });

    const { run } = npm({ versions: { [COMPONENTS]: ['1.0.4'] }, fail: [COMPONENTS] });

    await assert.rejects(
      buildDependencyUpdatePlans(new Map([entry('tryon', TRYON, '1.0.1')]), { run }),
      /could not be asked.*ETIMEDOUT/s,
    );
  });
});
