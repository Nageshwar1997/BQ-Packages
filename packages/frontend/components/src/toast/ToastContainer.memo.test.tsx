// @vitest-environment jsdom
import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { mount, unmountAll } from '../test-utils/react.js';
import { ToastContainer } from './ToastContainer.js';
import { useToastStore } from './toast.store.js';

// Every time a toast is rendered, its action button is rendered with it (the button is not memoized
// on purpose, so it is a fair counter of the renders of the toast around it).
const renders: string[] = [];

vi.mock('../ui/Button.js', () => ({
  Button: ({ content }: { content: string }) => {
    renders.push(content);

    return <button type="button">{content}</button>;
  },
}));

const { add, update } = useToastStore.getState();

const toastWithButton = (name: string) =>
  add({
    type: 'default',
    title: name,
    description: 'Description',
    buttonProps: { content: `Retry ${name}` },
  });

const advance = (ms: number) => {
  act(() => {
    vi.advanceTimersByTime(ms);
  });
};

// The store gives a new array for every change, but only the toast that was changed is a new
// object; the container renders again every time, so these tests are about what it does with the rest.
describe('the toasts that are shown', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    useToastStore.setState({ toasts: [] });
    renders.length = 0;
  });

  afterEach(() => {
    unmountAll();
    vi.useRealTimers();
  });

  it('are not rendered again when another toast is added', () => {
    toastWithButton('A');
    toastWithButton('B');
    mount(<ToastContainer />);
    advance(100); // they have slid in
    renders.length = 0;

    act(() => {
      toastWithButton('C');
    });

    expect(renders).toEqual(['Retry C']);
  });

  it('are not rendered again for each update of a toast that is uploading', () => {
    toastWithButton('A');
    const progressId = add({ type: 'progress', title: 'Uploading', progress: 0 });
    mount(<ToastContainer />);
    advance(100);
    renders.length = 0;

    for (let percent = 10; percent <= 100; percent += 10) {
      act(() => {
        update.progress(progressId, percent);
      });
    }

    expect(renders).toEqual([]);
  });

  it('are rendered again when they change', () => {
    const progressId = add({
      type: 'progress',
      title: 'Uploading',
      progress: 0,
      buttonProps: { content: 'Cancel' },
    });
    const view = mount(<ToastContainer />);
    advance(100);

    act(() => {
      update.progress(progressId, 60);
    });

    expect(view.container.textContent).toContain('60%');
  });
});
