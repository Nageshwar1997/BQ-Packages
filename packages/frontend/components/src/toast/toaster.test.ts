import { beforeEach, describe, expect, it } from 'vitest';

import { makeToasts } from '../test-utils/toasts.js';

const { store: useToastStore, toaster, withProgressToast } = makeToasts();

const toasts = () => useToastStore.getState().toasts;

describe('toaster', () => {
  beforeEach(() => {
    useToastStore.setState({ toasts: [] });
  });

  it.each(['success', 'error', 'warning', 'default'] as const)(
    'shows a %s toast with the title and the description it was given',
    (type) => {
      const id = toaster[type]({ title: 'Title', description: 'Description' });

      expect(toasts()).toEqual([{ id, type, title: 'Title', description: 'Description' }]);
    },
  );

  it('does not let the caller change the type of a success, error, warning or default toast', () => {
    // `type` is not part of what these take, but a caller that is not type checked could pass one
    const sneaky = { title: 'Title', type: 'custom' } as unknown as Parameters<
      typeof toaster.default
    >[0];

    toaster.default(sneaky);

    expect(toasts()[0]?.type).toBe('default');
  });

  it('shows a loading toast', () => {
    const id = toaster.loading({ title: 'Please wait...', description: 'Working on it' });

    expect(toasts()).toEqual([
      { id, type: 'loading', title: 'Please wait...', description: 'Working on it' },
    ]);
  });

  it('shows a custom toast with the content it was given', () => {
    const id = toaster.custom({ type: 'custom', children: 'Any content' });

    expect(toasts()).toEqual([{ id, type: 'custom', children: 'Any content' }]);
  });

  it('removes a toast by its id and leaves the others', () => {
    const first = toaster.default({ title: 'First' });
    const second = toaster.default({ title: 'Second' });

    toaster.remove(first);

    expect(toasts().map(({ id }) => id)).toEqual([second]);
  });

  it('shows toasts in the store it was made for, and in no other', () => {
    const other = makeToasts();

    toaster.default({ title: 'Mine' });
    other.toaster.default({ title: 'Theirs' });

    expect(toasts().map(({ title }) => title)).toEqual(['Mine']);
    expect(other.store.getState().toasts.map(({ title }) => title)).toEqual(['Theirs']);
  });

  describe('withProgressToast', () => {
    const progressOf = () => {
      const toast = toasts().at(0);

      return toast?.type === 'progress' ? toast.progress : undefined;
    };

    it('follows the request, and takes the toast away when it is over', async () => {
      const seen: (number | undefined)[] = [];

      const result = await withProgressToast({
        title: 'Uploading',
        description: 'One moment',
        request: (onProgress) => {
          seen.push(progressOf()); // starts at 0
          onProgress({ loaded: 50, total: 200 });
          seen.push(progressOf());
          onProgress({ loaded: 100 }); // no total: the browser does not know, the toast stays as it is
          seen.push(progressOf());
          onProgress({ loaded: 200, total: 200 });
          seen.push(progressOf());

          return Promise.resolve('done');
        },
      });

      expect(result).toBe('done');
      expect(seen).toEqual([0, 25, 25, 100]);
      expect(toasts()).toEqual([]);
    });

    it('shows 100 for a moment before it goes, also when the request never said how far it was', async () => {
      const seen: (number | undefined)[] = [];
      const unsubscribe = useToastStore.subscribe(() => {
        seen.push(progressOf());
      });

      await withProgressToast({ title: 'Uploading', request: () => Promise.resolve() });
      unsubscribe();

      expect(seen).toEqual([0, 100, undefined]); // added, set to 100, taken away
    });

    it('takes the toast away, and gives the error back, when the request fails', async () => {
      await expect(
        withProgressToast({
          title: 'Uploading',
          request: () => Promise.reject(new Error('Offline')),
        }),
      ).rejects.toThrow('Offline');

      expect(toasts()).toEqual([]);
    });

    it('shows its toast in the store it was made for', async () => {
      const other = makeToasts();
      let during: string[] = [];

      await withProgressToast({
        title: 'Uploading',
        request: () => {
          during = other.store.getState().toasts.map(({ type }) => type);

          return Promise.resolve();
        },
      });

      expect(during).toEqual([]); // nothing in the other store
    });
  });
});
