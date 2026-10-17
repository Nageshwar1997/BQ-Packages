import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { after, before, describe, it } from 'node:test';

import { buildDependencyLines } from './prompts.mjs';
import { updatePackageJsonForRelease } from './republish.mjs';

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
