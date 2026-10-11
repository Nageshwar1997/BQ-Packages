import { create } from 'zustand';

import { createId } from './id.js';
import type { TStoreHook } from './types.js';

export type TActionFn = () => void | Promise<void>;

export interface IActionItem {
  id: string;
  fn: TActionFn;
  /** How many times it failed so far. */
  retries: number;
  /** How many times it is tried again after failing, before it is dropped. */
  maxRetries: number;
}

export interface IActionsStore {
  actions: IActionItem[];
  /** Adds an action to the end of the queue and gives its id. */
  addAction: (fn: TActionFn, options?: { maxRetries?: number }) => string;
  removeAction: (id: string) => void;
  clearActions: () => void;
  /** Runs the first action: it leaves the queue when it worked, or when it failed for good. */
  runNextAction: () => Promise<void>;
  /** Runs the actions one after the other until the queue is empty. */
  runAllActions: () => Promise<void>;
}

export interface IActionsStoreOptions {
  /**
   * How many times an action is tried again after it failed, unless it says its own.
   * @default 3
   */
  maxRetries?: number;
  /**
   * How long to wait before an action is tried again, given how many times it failed before.
   * @default 0.5s, 1s, 2s, 4s... (500 * 2 ** failures)
   */
  retryDelayMs?: (failures: number) => number;
  /**
   * Where failures are reported.
   * @default console
   */
  logger?: Pick<Console, 'error' | 'warn'>;
}

export type TActionsStoreHook = TStoreHook<IActionsStore>;

const sleep = (ms: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });

/**
 * A queue of actions that are run one after the other, each tried again with a growing wait when it
 * fails (e.g. requests that could not be sent while offline). Call it once, in a module of the app,
 * and export what it gives back: every call makes a queue of its own.
 */
export const createActionsStore = ({
  maxRetries: defaultMaxRetries = 3,
  retryDelayMs = (failures) => 500 * 2 ** failures,
  logger = console,
}: IActionsStoreOptions = {}): TActionsStoreHook =>
  create<IActionsStore>((set, get) => {
    // Actions are found by their id each time: while one runs (it can take a while) others can be
    // added or removed, and a list that was read before it started would undo that.
    const without = (id: string) => (state: IActionsStore) => ({
      actions: state.actions.filter((action) => action.id !== id),
    });

    return {
      actions: [],

      addAction: (fn, options) => {
        const id = createId('action');
        const item: IActionItem = {
          id,
          fn,
          retries: 0,
          maxRetries: options?.maxRetries ?? defaultMaxRetries,
        };

        set((state) => ({ actions: [...state.actions, item] }));

        return id;
      },

      removeAction: (id) => {
        set(without(id));
      },

      clearActions: () => {
        set({ actions: [] });
      },

      runNextAction: async () => {
        const current = get().actions.at(0);

        if (!current) return;

        try {
          await current.fn();
          set(without(current.id));
        } catch (error) {
          logger.error('Action failed:', error);

          if (current.retries >= current.maxRetries) {
            logger.warn('Max retries reached, dropping the action');
            set(without(current.id));

            return;
          }

          await sleep(retryDelayMs(current.retries));
          set((state) => ({
            actions: state.actions.map((action) =>
              action.id === current.id ? { ...action, retries: action.retries + 1 } : action,
            ),
          }));
        }
      },

      runAllActions: async () => {
        while (get().actions.length > 0) {
          await get().runNextAction();
        }
      },
    };
  });
