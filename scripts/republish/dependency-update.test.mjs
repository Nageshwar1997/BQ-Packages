import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  applyDependencyUpdates,
  collectDependencyNames,
  fetchLatestVersions,
  planDependencyUpdates,
  planDependencyUpdatesFor,
} from './dependency-update.mjs';

/**
 * A release plan with the given packages in it (only the names are looked at).
 *
 * @param {Record<string, string>} nextVersions
 */
const releasePlanOf = (nextVersions) =>
  new Map(Object.entries(nextVersions).map(([name, nextVersion]) => [name, { nextVersion }]));

const latest = (entries) => new Map(Object.entries(entries));

const plan = (packageJson, versions, options) =>
  planDependencyUpdates(packageJson, latest(versions), options);

describe('planDependencyUpdates', () => {
  it('moves a dependency to the latest version, in the style of its range', () => {
    const { updates } = plan(
      {
        dependencies: { zod: '^3.0.0', tilde: '~1.2.3' },
        devDependencies: { vitest: '^5.0.0' },
      },
      { zod: '4.1.2', tilde: '1.2.9', vitest: '5.2.0' },
    );

    assert.deepEqual(
      updates.map(({ name, field, from, to }) => [name, field, from, to]),
      [
        ['zod', 'dependencies', '^3.0.0', '^4.1.2'],
        ['tilde', 'dependencies', '~1.2.3', '~1.2.9'],
        ['vitest', 'devDependencies', '^5.0.0', '^5.2.0'],
      ],
    );
  });

  it('says how big the step is', () => {
    const { updates } = plan(
      { dependencies: { major: '^1.0.0', minor: '^1.0.0', patch: '^1.0.0' } },
      { major: '2.0.0', minor: '1.1.0', patch: '1.0.1' },
    );

    assert.deepEqual(
      updates.map(({ name, change }) => [name, change]),
      [
        ['major', 'major'],
        ['minor', 'minor'],
        ['patch', 'patch'],
      ],
    );
  });

  it('does nothing for a dependency that is up to date, and never goes back to an older version', () => {
    const { updates, skipped } = plan(
      { dependencies: { same: '^2.0.0', ahead: '^3.1.0' } },
      { same: '2.0.0', ahead: '3.0.0' },
    );

    assert.deepEqual(updates, []);
    assert.deepEqual(skipped, []);
  });

  describe('what it leaves as it is', () => {
    it('leaves the compiler: a major version of it is raised by hand', () => {
      const { updates, skipped } = plan(
        { devDependencies: { typescript: '^6.0.3' } },
        { typescript: '7.0.0' },
      );

      assert.deepEqual(updates, []);
      assert.deepEqual(skipped, [
        { name: 'typescript', field: 'devDependencies', range: '^6.0.3', reason: 'excluded' },
      ]);
    });

    it('takes the list of what to leave from the caller', () => {
      const { updates } = plan(
        { devDependencies: { typescript: '^6.0.3' } },
        { typescript: '7.0.0' },
        { excluded: [] },
      );

      assert.equal(updates.length, 1);
    });

    it('leaves an exact version: it was pinned on purpose', () => {
      const { updates, skipped } = plan(
        { dependencies: { '@mediapipe/tasks-vision': '1.0.1' } },
        { '@mediapipe/tasks-vision': '1.1.1' },
      );

      assert.deepEqual(updates, []);
      assert.equal(skipped[0]?.reason, 'pinned');
    });

    it('leaves the peer range of another package: raising it would shut out older versions', () => {
      const { updates, skipped } = plan(
        { peerDependencies: { react: '^19.0.0' } },
        { react: '19.3.1' },
      );

      assert.deepEqual(updates, []);
      assert.equal(skipped[0]?.reason, 'peer');
    });

    it('raises the peer range of a package of the repository: an app is not left with a peer that lacks a fix', () => {
      const { updates } = plan(
        { peerDependencies: { '@beautinique/frontend-components': '^1.0.9' } },
        { '@beautinique/frontend-components': '1.0.10' },
      );

      assert.deepEqual(
        updates.map(({ name, to, internal }) => [name, to, internal]),
        [['@beautinique/frontend-components', '^1.0.10', true]],
      );
    });

    for (const range of [
      '^7.0.0 || ^8.0.0',
      '>=18',
      '*',
      'latest',
      'workspace:*',
      'file:../x',
      '1.x',
    ]) {
      it(`leaves a range that is not one version (${range})`, () => {
        const { updates, skipped } = plan({ dependencies: { thing: range } }, { thing: '9.9.9' });

        assert.deepEqual(updates, []);
        assert.equal(skipped[0]?.reason, 'range');
      });
    }

    it('leaves a package that npm does not know (never published, or not reachable)', () => {
      const { updates, skipped } = plan({ dependencies: { '@beautinique/never': '^1.0.0' } }, {});

      assert.deepEqual(updates, []);
      assert.equal(skipped[0]?.reason, 'unknown');
    });

    it('leaves the packages that are in the release: they take the version they are released with', () => {
      const { updates, skipped } = plan(
        { dependencies: { '@beautinique/frontend-components': '^1.0.9' } },
        { '@beautinique/frontend-components': '1.0.10' },
        { releasePlan: releasePlanOf({ '@beautinique/frontend-components': '1.0.11' }) },
      );

      assert.deepEqual(updates, []);
      assert.deepEqual(skipped, []);
    });
  });

  it('plans the same package in two fields on its own', () => {
    const { updates } = plan(
      { dependencies: { a: '^1.0.0' }, devDependencies: { a: '^1.0.0' } },
      { a: '1.5.0' },
    );

    assert.deepEqual(
      updates.map(({ field, to }) => [field, to]),
      [
        ['dependencies', '^1.5.0'],
        ['devDependencies', '^1.5.0'],
      ],
    );
  });

  it('copes with a package.json that has no dependencies at all', () => {
    assert.deepEqual(plan({}, {}), { updates: [], skipped: [] });
  });
});

describe('applyDependencyUpdates', () => {
  it('writes the new ranges, and only those', () => {
    const packageJson = {
      dependencies: { a: '^1.0.0', b: '^1.0.0' },
      devDependencies: { c: '^1.0.0' },
    };
    const { updates } = plan(packageJson, { a: '2.0.0', c: '1.1.0' });

    assert.equal(applyDependencyUpdates(packageJson, updates), true);
    assert.deepEqual(packageJson, {
      dependencies: { a: '^2.0.0', b: '^1.0.0' },
      devDependencies: { c: '^1.1.0' },
    });
  });

  it('says that nothing changed when there is nothing to do', () => {
    const packageJson = { dependencies: { a: '^1.0.0' } };

    assert.equal(applyDependencyUpdates(packageJson, []), false);
    assert.equal(
      applyDependencyUpdates(packageJson, [
        {
          name: 'a',
          field: 'dependencies',
          from: '^1.0.0',
          to: '^1.0.0',
          change: 'other',
          internal: false,
        },
      ]),
      false,
    );
  });
});

describe('collectDependencyNames', () => {
  it('lists each name once, whatever the field, and leaves out the packages in the release', () => {
    const names = collectDependencyNames(
      {
        dependencies: { a: '^1.0.0', '@beautinique/in-release': '^1.0.0' },
        devDependencies: { a: '^1.0.0', b: '^2.0.0' },
        peerDependencies: { c: '^3.0.0' },
      },
      releasePlanOf({ '@beautinique/in-release': '1.0.1' }),
    );

    assert.deepEqual(names.sort(), ['a', 'b', 'c']);
  });
});

describe('fetchLatestVersions', () => {
  /** @param {Record<string, string | Error>} answers */
  const runner = (answers) => async (_command, args) => {
    const answer = answers[args[1]];

    if (answer instanceof Error) {
      throw answer;
    }

    return { stdout: answer === undefined ? '' : JSON.stringify(answer) };
  };

  it('asks npm for the latest version of every name once', async () => {
    const asked = [];
    const run = async (command, args) => {
      asked.push([command, ...args]);

      return { stdout: JSON.stringify('1.2.3') };
    };

    const { versions } = await fetchLatestVersions(['a', 'b', 'a'], { run });

    assert.deepEqual(
      [...versions],
      [
        ['a', '1.2.3'],
        ['b', '1.2.3'],
      ],
    );
    assert.deepEqual(asked.map((call) => call[2]).sort(), ['a', 'b']);
    assert.deepEqual(asked[0]?.slice(0, 2), ['npm', 'view']);
    assert.ok(asked[0]?.includes('dist-tags.latest'));
  });

  it('leaves out a package that is not on npm, without calling it a failure', async () => {
    const { versions, failures } = await fetchLatestVersions(['known', 'new'], {
      run: runner({ known: '2.0.0', new: new Error('npm error code E404') }),
    });

    assert.deepEqual([...versions], [['known', '2.0.0']]);
    assert.equal(failures.size, 0);
  });

  it('tells which names it could not ask (offline), and goes on with the rest', async () => {
    const { versions, failures } = await fetchLatestVersions(['ok', 'down'], {
      run: runner({ ok: '1.0.0', down: new Error('getaddrinfo ENOTFOUND registry.npmjs.org') }),
    });

    assert.deepEqual([...versions], [['ok', '1.0.0']]);
    assert.deepEqual([...failures.keys()], ['down']);
  });

  it('reads the answer when npm gives a list of one version (inside a workspace) as well as a string', async () => {
    const { versions } = await fetchLatestVersions(['listed', 'plain'], {
      run: runner({ listed: ['4.6.7'], plain: '1.0.0' }),
    });

    assert.deepEqual([...versions].sort(), [
      ['listed', '4.6.7'],
      ['plain', '1.0.0'],
    ]);
  });

  it('ignores an answer that is not a version', async () => {
    const { versions } = await fetchLatestVersions(['odd'], {
      run: runner({ odd: 'not-a-version' }),
    });

    assert.equal(versions.size, 0);
  });

  it('works with no names at all', async () => {
    const { versions, failures } = await fetchLatestVersions([]);

    assert.equal(versions.size, 0);
    assert.equal(failures.size, 0);
  });

  it('never has more than `concurrency` questions open at once', async () => {
    let open = 0;
    let most = 0;
    const run = async () => {
      open += 1;
      most = Math.max(most, open);
      await new Promise((resolve) => setTimeout(resolve, 5));
      open -= 1;

      return { stdout: JSON.stringify('1.0.0') };
    };

    await fetchLatestVersions(
      Array.from({ length: 12 }, (_, i) => `p${String(i)}`),
      {
        run,
        concurrency: 3,
      },
    );

    assert.ok(most <= 3, `at most 3 at once, was ${String(most)}`);
    assert.ok(most > 1, 'and they do run side by side');
  });
});

describe('planDependencyUpdatesFor', () => {
  it('asks about each name once for all the packages, and plans each package on its own', async () => {
    const asked = [];
    const run = async (_command, args) => {
      asked.push(args[1]);

      return { stdout: JSON.stringify(args[1] === 'shared' ? '2.0.0' : '1.1.0') };
    };

    const { plans } = await planDependencyUpdatesFor(
      new Map([
        ['one', { dependencies: { shared: '^1.0.0' } }],
        ['two', { dependencies: { shared: '^1.0.0', own: '^1.0.0' } }],
      ]),
      { run },
    );

    assert.deepEqual(asked.sort(), ['own', 'shared']);
    assert.deepEqual(
      plans.get('one')?.updates.map(({ to }) => to),
      ['^2.0.0'],
    );
    assert.deepEqual(
      plans.get('two')?.updates.map(({ name, to }) => [name, to]),
      [
        ['shared', '^2.0.0'],
        ['own', '^1.1.0'],
      ],
    );
  });
});
