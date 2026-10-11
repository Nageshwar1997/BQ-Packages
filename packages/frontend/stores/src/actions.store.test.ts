// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createActionsStore } from './actions.store.js';

const silent = () => ({ error: vi.fn(), warn: vi.fn() });

/** A promise that is settled from the outside, to make an action take as long as the test wants. */
const deferred = () => {
  let resolve: () => void = () => undefined;
  let reject: (error: Error) => void = () => undefined;
  const promise = new Promise<void>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return { promise, resolve, reject };
};

const idsOf = (store: ReturnType<typeof createActionsStore>) =>
  store.getState().actions.map(({ id }) => id);

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('createActionsStore', () => {
  describe('the queue', () => {
    it('starts empty', () => {
      expect(createActionsStore().getState().actions).toEqual([]);
    });

    it('adds actions to the end, each with its own id, and gives the id', () => {
      const store = createActionsStore();
      const first = store.getState().addAction(() => undefined);
      const second = store.getState().addAction(() => undefined);

      expect(first).not.toBe(second);
      expect(idsOf(store)).toEqual([first, second]);
      expect(store.getState().actions[0]).toMatchObject({ id: first, retries: 0, maxRetries: 3 });
    });

    it('removes an action by its id and leaves the others', () => {
      const store = createActionsStore();
      const first = store.getState().addAction(() => undefined);
      const second = store.getState().addAction(() => undefined);

      store.getState().removeAction(first);

      expect(idsOf(store)).toEqual([second]);
    });

    it('removes them all', () => {
      const store = createActionsStore();

      store.getState().addAction(() => undefined);
      store.getState().addAction(() => undefined);
      store.getState().clearActions();

      expect(store.getState().actions).toEqual([]);
    });

    it('gives an id even where `crypto.randomUUID` does not exist (a page that is not https)', () => {
      vi.stubGlobal('crypto', {});
      const store = createActionsStore();
      const ids = [
        store.getState().addAction(() => undefined),
        store.getState().addAction(() => undefined),
        store.getState().addAction(() => undefined),
      ];

      expect(new Set(ids).size).toBe(3);
    });
  });

  describe('maxRetries', () => {
    it('is 3 unless it is said otherwise', () => {
      const store = createActionsStore();

      store.getState().addAction(() => undefined);

      expect(store.getState().actions[0]?.maxRetries).toBe(3);
    });

    it('is the one of the store, when the store has one', () => {
      const store = createActionsStore({ maxRetries: 5 });

      store.getState().addAction(() => undefined);

      expect(store.getState().actions[0]?.maxRetries).toBe(5);
    });

    it('is the one of the action, before the one of the store', () => {
      const store = createActionsStore({ maxRetries: 5 });

      store.getState().addAction(() => undefined, { maxRetries: 0 });

      expect(store.getState().actions[0]?.maxRetries).toBe(0);
    });
  });

  describe('runNextAction', () => {
    it('does nothing with an empty queue', async () => {
      await expect(createActionsStore().getState().runNextAction()).resolves.toBeUndefined();
    });

    it('runs the first action, and it leaves the queue when it worked', async () => {
      const store = createActionsStore();
      const first = vi.fn();
      const second = vi.fn();

      store.getState().addAction(first);
      store.getState().addAction(second);
      await store.getState().runNextAction();

      expect(first).toHaveBeenCalledTimes(1);
      expect(second).not.toHaveBeenCalled();
      expect(store.getState().actions).toHaveLength(1);
    });

    it('waits for an action that is async', async () => {
      const store = createActionsStore();
      const action = deferred();

      store.getState().addAction(() => action.promise);

      let finished = false;
      const run = store
        .getState()
        .runNextAction()
        .then(() => {
          finished = true;
        });

      await vi.advanceTimersByTimeAsync(1000);
      expect(finished).toBe(false);
      expect(store.getState().actions).toHaveLength(1);

      action.resolve();
      await run;
      expect(store.getState().actions).toHaveLength(0);
    });

    describe('when an action fails', () => {
      it('reports it, waits 0.5s, 1s, 2s before each new try, and drops it after the last', async () => {
        const logger = silent();
        const store = createActionsStore({ logger });
        const action = vi.fn(() => {
          throw new Error('offline');
        });

        store.getState().addAction(action);

        const delays: number[] = [];

        for (const delay of [500, 1000, 2000]) {
          let finished = false;
          const run = store
            .getState()
            .runNextAction()
            .then(() => {
              finished = true;
            });

          await vi.advanceTimersByTimeAsync(delay - 1);
          expect(finished, `still waiting after ${String(delay - 1)}ms`).toBe(false);

          await vi.advanceTimersByTimeAsync(1);
          await run;
          delays.push(delay);
          expect(store.getState().actions[0]?.retries).toBe(delays.length);
        }

        // the 4th failure is the last one: no wait, it is dropped
        await store.getState().runNextAction();

        expect(store.getState().actions).toEqual([]);
        expect(action).toHaveBeenCalledTimes(4);
        expect(logger.error).toHaveBeenCalledTimes(4);
        expect(logger.warn).toHaveBeenCalledTimes(1);
      });

      it('is dropped at once when it may not be tried again', async () => {
        const logger = silent();
        const store = createActionsStore({ logger });

        store.getState().addAction(
          () => {
            throw new Error('offline');
          },
          { maxRetries: 0 },
        );
        await store.getState().runNextAction();

        expect(store.getState().actions).toEqual([]);
        expect(logger.warn).toHaveBeenCalledTimes(1);
      });

      it('goes on being tried until it works', async () => {
        const store = createActionsStore({ logger: silent() });
        const action = vi
          .fn<() => Promise<void>>()
          .mockRejectedValueOnce(new Error('offline'))
          .mockResolvedValue(undefined);

        store.getState().addAction(action);

        const first = store.getState().runNextAction();

        await vi.advanceTimersByTimeAsync(500);
        await first;
        expect(store.getState().actions).toHaveLength(1);

        await store.getState().runNextAction();
        expect(store.getState().actions).toHaveLength(0);
        expect(action).toHaveBeenCalledTimes(2);
      });

      it('uses the waits that were asked for', async () => {
        const retryDelayMs = vi.fn((failures: number) => (failures + 1) * 10);
        const store = createActionsStore({ retryDelayMs, logger: silent() });

        store.getState().addAction(() => {
          throw new Error('offline');
        });

        const run = store.getState().runNextAction();

        await vi.advanceTimersByTimeAsync(10);
        await run;

        expect(retryDelayMs).toHaveBeenCalledWith(0);
      });

      it('reports to the console unless a logger was given', async () => {
        const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
        const store = createActionsStore();

        store.getState().addAction(
          () => {
            throw new Error('offline');
          },
          { maxRetries: 0 },
        );
        vi.spyOn(console, 'warn').mockImplementation(() => undefined);
        await store.getState().runNextAction();

        expect(error).toHaveBeenCalledWith('Action failed:', expect.any(Error));
        vi.restoreAllMocks();
      });
    });

    describe('while an action is running', () => {
      it('keeps an action that was added meanwhile', async () => {
        const store = createActionsStore();
        const running = deferred();

        store.getState().addAction(() => running.promise);

        const run = store.getState().runNextAction();
        const added = store.getState().addAction(() => undefined);

        running.resolve();
        await run;

        expect(idsOf(store)).toEqual([added]);
      });

      it('does not bring back an action that was removed meanwhile, when it fails', async () => {
        const store = createActionsStore({ logger: silent() });
        const running = deferred();
        const id = store.getState().addAction(() => running.promise);

        const run = store.getState().runNextAction();

        store.getState().removeAction(id);
        running.reject(new Error('offline'));
        await vi.advanceTimersByTimeAsync(500);
        await run;

        expect(store.getState().actions).toEqual([]);
      });

      it('does not drop the next action when the running one was removed and then worked', async () => {
        const store = createActionsStore();
        const running = deferred();
        const id = store.getState().addAction(() => running.promise);
        const next = store.getState().addAction(() => undefined);

        const run = store.getState().runNextAction();

        store.getState().removeAction(id);
        running.resolve();
        await run;

        expect(idsOf(store)).toEqual([next]);
      });

      it('keeps the failed action where it was, with the ones added meanwhile after it', async () => {
        const store = createActionsStore({ logger: silent() });
        const running = deferred();
        const failing = store.getState().addAction(() => running.promise);

        const run = store.getState().runNextAction();
        const added = store.getState().addAction(() => undefined);

        running.reject(new Error('offline'));
        await vi.advanceTimersByTimeAsync(500);
        await run;

        expect(idsOf(store)).toEqual([failing, added]);
        expect(store.getState().actions[0]?.retries).toBe(1);
      });
    });
  });

  describe('runAllActions', () => {
    it('runs the actions one after the other, in the order they were added', async () => {
      const store = createActionsStore();
      const order: string[] = [];

      for (const name of ['a', 'b', 'c']) {
        store.getState().addAction(async () => {
          await Promise.resolve();
          order.push(name);
        });
      }

      await store.getState().runAllActions();

      expect(order).toEqual(['a', 'b', 'c']);
      expect(store.getState().actions).toEqual([]);
    });

    it('goes on after an action that was dropped, and tries the ones that fail again first', async () => {
      const store = createActionsStore({ logger: silent() });
      const order: string[] = [];
      const flaky = vi
        .fn<() => void>()
        .mockImplementationOnce(() => {
          throw new Error('offline');
        })
        .mockImplementation(() => {
          order.push('flaky');
        });

      store.getState().addAction(flaky);
      store.getState().addAction(() => {
        order.push('second');
      });
      store.getState().addAction(
        () => {
          throw new Error('never works');
        },
        { maxRetries: 0 },
      );

      const all = store.getState().runAllActions();

      await vi.runAllTimersAsync();
      await all;

      expect(order).toEqual(['flaky', 'second']);
      expect(store.getState().actions).toEqual([]);
    });

    it('does nothing with an empty queue', async () => {
      await expect(createActionsStore().getState().runAllActions()).resolves.toBeUndefined();
    });
  });

  it('makes a queue of its own each time it is called', () => {
    const first = createActionsStore();
    const second = createActionsStore();

    first.getState().addAction(() => undefined);

    expect(second.getState().actions).toEqual([]);
  });
});
