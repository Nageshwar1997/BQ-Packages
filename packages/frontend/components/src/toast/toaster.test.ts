import { beforeEach, describe, expect, it } from 'vitest';

import { useToastStore } from './toast.store.js';
import { toaster } from './toaster.js';

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
});
