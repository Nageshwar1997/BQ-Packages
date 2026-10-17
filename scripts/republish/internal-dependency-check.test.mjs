import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { ValidationError } from '../common/errors.mjs';
import {
  assertInternalDependenciesAvailable,
  buildUnavailableMessage,
  collectInternalDependencyNames,
  fetchPublishedVersions,
  findUnavailableInternalDependencies,
} from './internal-dependency-check.mjs';

const A = '@beautinique/frontend-tryon';
const B = '@beautinique/frontend-components';

/** A release plan with these packages and the versions they are released with. */
const releaseOf = (versions = {}) =>
  new Map(Object.entries(versions).map(([name, nextVersion]) => [name, { nextVersion }]));

/** The versions that exist on npm, as `findUnavailableInternalDependencies` is given them. */
const onNpm = (versions = {}) => new Map(Object.entries(versions));

/** A stand-in for `npm view <name> versions --json`. */
const npmWith = (answers) => {
  /** @type {string[]} */
  const asked = [];

  const run = async (command, args) => {
    assert.equal(command, 'npm');
    assert.deepEqual([args[0], args[2], args[3]], ['view', 'versions', '--json']);
    asked.push(args[1]);

    const answer = answers[args[1]];

    if (answer instanceof Error) {
      throw answer;
    }

    return { stdout: answer === undefined ? '' : JSON.stringify(answer) };
  };

  return { run, asked };
};

const notFound = () => new Error('npm error code E404');

describe('fetchPublishedVersions', () => {
  it('reads the list of versions of each package', async () => {
    const { run, asked } = npmWith({ [A]: ['1.0.0', '1.0.1'], [B]: ['2.0.0'] });

    const { versions, failures } = await fetchPublishedVersions([A, B], { run });

    assert.deepEqual(
      [...versions],
      [
        [A, ['1.0.0', '1.0.1']],
        [B, ['2.0.0']],
      ],
    );
    assert.equal(failures.size, 0);
    assert.deepEqual(asked.sort(), [A, B].sort());
  });

  it('reads the single string npm answers with when only one version was ever published', async () => {
    const { run } = npmWith({ [A]: '1.0.0' });

    assert.deepEqual((await fetchPublishedVersions([A], { run })).versions.get(A), ['1.0.0']);
  });

  it('reads a list inside a list, and drops what is not a version', async () => {
    const { run } = npmWith({ [A]: [['1.0.0'], 'latest', 7, null, '1.0.1'] });

    assert.deepEqual((await fetchPublishedVersions([A], { run })).versions.get(A), [
      '1.0.0',
      '1.0.1',
    ]);
  });

  it('gives an empty list to a package that was never published (404) or answers nothing', async () => {
    const { run } = npmWith({ [A]: notFound() });

    const { versions, failures } = await fetchPublishedVersions([A, B], { run });

    assert.deepEqual(versions.get(A), []);
    assert.deepEqual(versions.get(B), []);
    assert.equal(failures.size, 0);
  });

  it('keeps a failure of npm apart: not knowing is not the same as "does not exist"', async () => {
    const { run } = npmWith({ [A]: new Error('ECONNRESET'), [B]: ['1.0.0'] });

    const { versions, failures } = await fetchPublishedVersions([A, B], { run });

    assert.deepEqual([...failures], [[A, 'ECONNRESET']]);
    assert.equal(versions.has(A), false);
    assert.deepEqual(versions.get(B), ['1.0.0']);
  });

  it('asks about a name once', async () => {
    const { run, asked } = npmWith({ [A]: ['1.0.0'] });

    await fetchPublishedVersions([A, A, A], { run });

    assert.deepEqual(asked, [A]);
  });
});

describe('findUnavailableInternalDependencies', () => {
  const find = (packageJson, { release = {}, published = {} } = {}) =>
    findUnavailableInternalDependencies(
      { name: A, ...packageJson },
      { releasePlan: releaseOf(release), publishedVersions: onNpm(published) },
    );

  it('accepts a range that a version on npm fits', () => {
    assert.deepEqual(
      find({ dependencies: { [B]: '^1.0.4' } }, { published: { [B]: ['1.0.3', '1.0.5'] } }),
      [],
    );
  });

  it('finds a range that no version on npm fits, and says what the latest on npm is', () => {
    assert.deepEqual(
      find(
        { peerDependencies: { [B]: '^1.0.11' } },
        { published: { [B]: ['1.0.3', '1.0.5', '1.0.10', '0.0.0-stage'] } },
      ),
      [
        {
          packageName: A,
          field: 'peerDependencies',
          name: B,
          range: '^1.0.11',
          reason: 'no-matching-version',
          latestPublished: '1.0.10',
          releaseVersion: null,
        },
      ],
    );
  });

  it('finds a package that is not on npm at all', () => {
    const [problem] = find({ dependencies: { [B]: '^1.0.0' } }, { published: { [B]: [] } });

    assert.equal(problem.reason, 'not-published');
    assert.equal(problem.latestPublished, null);
  });

  it('finds a package it knows nothing about (as "not on npm")', () => {
    assert.equal(find({ dependencies: { [B]: '^1.0.0' } })[0].reason, 'not-published');
  });

  it('accepts a package of this release when the version it is released with fits, even if npm has nothing', () => {
    assert.deepEqual(
      find(
        { dependencies: { [B]: '^1.0.6' } },
        { release: { [B]: '1.0.6' }, published: { [B]: [] } },
      ),
      [],
    );
  });

  it('accepts a package of this release whose new version does not fit but an old one on npm does', () => {
    assert.deepEqual(
      find(
        { dependencies: { [B]: '<2.0.0' } },
        { release: { [B]: '2.0.0' }, published: { [B]: ['1.5.0'] } },
      ),
      [],
    );
  });

  it('finds a package of this release that neither its new version nor npm fits', () => {
    const [problem] = find(
      { dependencies: { [B]: '^1.0.0' } },
      { release: { [B]: '2.0.0' }, published: { [B]: [] } },
    );

    assert.equal(problem.reason, 'release-version');
    assert.equal(problem.releaseVersion, '2.0.0');
  });

  it('looks at the four fields, each named in its problem', () => {
    const fields = ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies'];
    const problems = find(Object.fromEntries(fields.map((field) => [field, { [B]: '^9.0.0' }])), {
      published: { [B]: ['1.0.0'] },
    });

    assert.deepEqual(
      problems.map(({ field }) => field),
      fields,
    );
  });

  it('understands ~ and an exact version', () => {
    const problems = find(
      { dependencies: { [B]: '~1.1.0' }, devDependencies: { [B]: '1.0.6' } },
      { published: { [B]: ['1.0.5', '1.1.0'] } },
    );

    assert.deepEqual(
      problems.map(({ field }) => field),
      ['devDependencies'],
    );
  });

  it('does not look at what is not a package of the repository, or not a range', () => {
    assert.deepEqual(
      find({
        dependencies: {
          react: '^99.0.0',
          [B]: 'workspace:*',
          '@beautinique/frontend-hooks': 'file:../hooks',
          '@beautinique/frontend-stores': 'latest',
        },
      }),
      [],
    );
  });

  it('accepts "*" when anything is on npm', () => {
    assert.deepEqual(find({ dependencies: { [B]: '*' } }, { published: { [B]: ['1.0.0'] } }), []);
  });

  it('has nothing to say about a package without dependencies', () => {
    assert.deepEqual(find({}), []);
  });
});

describe('collectInternalDependencyNames', () => {
  it('collects the packages of the repository that need to be asked about', () => {
    const names = collectInternalDependencyNames(
      new Map([
        [
          A,
          {
            dependencies: {
              react: '^19.0.0',
              [B]: '^1.0.6',
              '@beautinique/frontend-hooks': '^1.0.0',
              '@beautinique/frontend-types': '^1.0.0',
            },
            peerDependencies: { '@beautinique/frontend-stores': 'workspace:*' },
          },
        ],
      ]),
      // hooks is released as 1.0.0 (fits); types is released as 2.0.0 (does not fit ^1.0.0, so npm is asked)
      releaseOf({ '@beautinique/frontend-hooks': '1.0.0', '@beautinique/frontend-types': '2.0.0' }),
    );

    assert.deepEqual([...names], [B, '@beautinique/frontend-types']);
  });
});

describe('buildUnavailableMessage', () => {
  const problems = [
    {
      packageName: A,
      field: 'peerDependencies',
      name: B,
      range: '^1.0.6',
      reason: 'no-matching-version',
      latestPublished: '1.0.5',
      releaseVersion: null,
    },
    {
      packageName: A,
      field: 'dependencies',
      name: '@beautinique/frontend-hooks',
      range: '^1.0.0',
      reason: 'not-published',
      latestPublished: null,
      releaseVersion: null,
    },
    {
      packageName: '@beautinique/frontend-stores',
      field: 'dependencies',
      name: B,
      range: '^1.0.0',
      reason: 'release-version',
      latestPublished: null,
      releaseVersion: '2.0.0',
    },
  ];

  it('names the package, the dependency and the range, and says what to do', () => {
    const message = buildUnavailableMessage(problems);

    assert.match(message, /Not republished/);
    assert.match(message, /peerDependencies: @beautinique\/frontend-components \^1\.0\.6/);
    assert.match(message, /the latest on npm is 1\.0\.5/);
    assert.match(message, /Add @beautinique\/frontend-components to this republish/);
    assert.match(message, /e\.g\. \^1\.0\.5/);
    assert.match(message, /@beautinique\/frontend-hooks is not on npm at all/);
    assert.match(message, /is in this release as 2.0.0/);
    assert.match(message, /Nothing was changed\.$/);
  });

  it('names each package once, with its own problems under it', () => {
    const lines = buildUnavailableMessage(problems).split('\n');

    assert.equal(lines.filter((line) => line === A).length, 1);
    assert.equal(lines.filter((line) => line === '@beautinique/frontend-stores').length, 1);
    assert.ok(lines.indexOf(A) < lines.indexOf('@beautinique/frontend-stores'));
  });
});

describe('assertInternalDependenciesAvailable', () => {
  const packageJsons = (json) => new Map([[A, { name: A, ...json }]]);

  it('passes when every dependency has a version on npm', async () => {
    const { run } = npmWith({ [B]: ['1.0.5'] });

    await assertInternalDependenciesAvailable(
      packageJsons({ peerDependencies: { [B]: '^1.0.5' } }),
      releaseOf(),
      { run },
    );
  });

  it('does not ask npm about a package of the release that fits', async () => {
    const { run, asked } = npmWith({});

    await assertInternalDependenciesAvailable(
      packageJsons({ dependencies: { [B]: '^1.0.6' } }),
      releaseOf({ [B]: '1.0.6' }),
      { run },
    );

    assert.deepEqual(asked, []);
  });

  it('stops with the message of what cannot be installed', async () => {
    const { run } = npmWith({ [B]: ['1.0.5'] });

    await assert.rejects(
      assertInternalDependenciesAvailable(
        packageJsons({ peerDependencies: { [B]: '^1.0.6' } }),
        releaseOf(),
        { run },
      ),
      (error) => {
        assert.ok(error instanceof ValidationError);
        assert.match(
          error.message,
          /peerDependencies: @beautinique\/frontend-components \^1\.0\.6/,
        );
        assert.match(error.message, /Nothing was changed\./);

        return true;
      },
    );
  });

  it('stops when npm cannot be asked: it does not pass what it could not look at', async () => {
    const { run } = npmWith({ [B]: new Error('ETIMEDOUT') });

    await assert.rejects(
      assertInternalDependenciesAvailable(
        packageJsons({ dependencies: { [B]: '^1.0.0' } }),
        releaseOf(),
        { run },
      ),
      (error) => {
        assert.ok(error instanceof ValidationError);
        assert.match(error.message, /could not be asked/);
        assert.match(error.message, /ETIMEDOUT/);
        assert.match(error.message, /Try again/);

        return true;
      },
    );
  });

  it('reports every package that has a problem, not only the first', async () => {
    const { run } = npmWith({ [B]: ['1.0.0'] });

    await assert.rejects(
      assertInternalDependenciesAvailable(
        new Map([
          [A, { name: A, dependencies: { [B]: '^2.0.0' } }],
          [
            '@beautinique/frontend-stores',
            { name: '@beautinique/frontend-stores', dependencies: { [B]: '^3.0.0' } },
          ],
        ]),
        releaseOf(),
        { run },
      ),
      (error) => {
        assert.match(error.message, new RegExp(`^${A}$`, 'm'));
        assert.match(error.message, /^@beautinique\/frontend-stores$/m);

        return true;
      },
    );
  });
});
