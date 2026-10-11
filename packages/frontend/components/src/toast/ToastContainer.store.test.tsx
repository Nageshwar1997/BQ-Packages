// @vitest-environment jsdom
import { fireEvent } from '@testing-library/react';
import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { mount, unmountAll } from '../test-utils/react.js';
import { makeToasts } from '../test-utils/toasts.js';
import { ToastContainer } from './ToastContainer.js';

const advance = (ms: number) => {
  act(() => {
    vi.advanceTimersByTime(ms);
  });
};

// The container draws the store the app gives it (the one `createToaster` was given too): the
// package holds no store of its own.
describe('the store the ToastContainer is given', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    unmountAll();
    vi.useRealTimers();
    document.body.replaceChildren();
  });

  it('draws nothing while that store has no toasts', () => {
    const { store } = makeToasts();
    const view = mount(<ToastContainer store={store} />);

    expect(view.container.innerHTML).toBe('');
  });

  it('draws the toasts of that store, also the ones added after it was shown', () => {
    const { store, toaster } = makeToasts();

    toaster.success({ title: 'Before' });
    const view = mount(<ToastContainer store={store} />);

    expect(view.container.textContent).toContain('Before');

    act(() => {
      toaster.error({ title: 'After' });
    });

    expect(view.container.textContent).toContain('After');
  });

  it('does not draw the toasts of another store', () => {
    const mine = makeToasts();
    const other = makeToasts();

    other.toaster.success({ title: 'Not mine' });
    mine.toaster.success({ title: 'Mine' });

    const view = mount(<ToastContainer store={mine.store} />);

    expect(view.container.textContent).toContain('Mine');
    expect(view.container.textContent).not.toContain('Not mine');
  });

  it('takes a toast out of that store when it is closed, and out of no other', () => {
    const mine = makeToasts();
    const other = makeToasts();

    other.toaster.success({ title: 'Not mine' });
    const id = mine.toaster.success({ title: 'Mine' });
    const view = mount(<ToastContainer store={mine.store} />);

    advance(60); // it has slid in

    const closeIcon = view.container.querySelectorAll('svg').item(1); // the icon comes first, then the close "x"

    fireEvent.click(closeIcon);
    advance(300); // it has slid out

    expect(mine.store.getState().toasts.map((toast) => toast.id)).not.toContain(id);
    expect(mine.store.getState().toasts).toEqual([]);
    expect(other.store.getState().toasts).toHaveLength(1);
  });

  it('takes a toast out of that store when it closes by itself', () => {
    const { store, toaster } = makeToasts();

    toaster.success({ title: 'Saved', closeTimer: 1000 });
    mount(<ToastContainer store={store} />);

    advance(60 + 1000 + 300);

    expect(store.getState().toasts).toEqual([]);
  });
});
