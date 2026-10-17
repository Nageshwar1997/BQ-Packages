import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, it, mock } from 'node:test';

import { installWorkspaceDependencies } from './package-lifecycle.mjs';

describe('installWorkspaceDependencies', () => {
  /** @type {import('node:test').Mock<(message?: unknown) => void>} */
  let warn;

  beforeEach(() => {
    mock.method(console, 'log', () => {});
    warn = mock.method(console, 'warn', () => {});
  });

  afterEach(() => {
    mock.restoreAll();
  });

  it('installs, then checks the install scripts npm blocked', async () => {
    /** @type {string[]} */
    const order = [];

    await installWorkspaceDependencies({
      install: async () => {
        order.push('install');
      },
      syncScripts: async () => {
        order.push('sync');
      },
    });

    assert.deepEqual(order, ['install', 'sync']);
    assert.equal(warn.mock.callCount(), 0);
  });

  it('does not fail when the check fails: it says so', async () => {
    await installWorkspaceDependencies({
      install: async () => {},
      syncScripts: async () => {
        throw new Error('Unknown command: install-scripts');
      },
    });

    assert.equal(warn.mock.callCount(), 1);
    assert.match(String(warn.mock.calls[0].arguments[0]), /Unknown command: install-scripts/);
    assert.match(String(warn.mock.calls[0].arguments[0]), /npm install-scripts ls/);
  });

  it('does not check anything when the install failed', async () => {
    let synced = false;

    await assert.rejects(
      installWorkspaceDependencies({
        install: async () => {
          throw new Error('npm install failed');
        },
        syncScripts: async () => {
          synced = true;
        },
      }),
      /npm install failed/,
    );
    assert.equal(synced, false);
  });
});
