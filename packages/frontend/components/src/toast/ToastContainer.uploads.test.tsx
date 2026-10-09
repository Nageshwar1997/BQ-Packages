// @vitest-environment jsdom
import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { mount, unmountAll } from '../test-utils/react.js';
import { ToastContainer } from './ToastContainer.js';
import { useToastStore } from './toast.store.js';
import { toaster } from './toaster.js';
import type { IUploadItem } from './types.js';

const row = (patch: Partial<IUploadItem> & Pick<IUploadItem, 'id' | 'label'>): IUploadItem => ({
  status: 'pending',
  loaded: 0,
  total: 100,
  fileSizes: [100],
  ...patch,
});

// 1 of 3 files of the description sent, ingredients waiting (2 files), instructions done (1 file).
const contentUploads = (): IUploadItem[] => [
  row({
    id: 'description',
    label: 'Description',
    status: 'uploading',
    loaded: 150,
    total: 300,
    fileSizes: [100, 100, 100],
  }),
  row({ id: 'ingredients', label: 'Ingredients', total: 200, fileSizes: [100, 100] }),
  row({ id: 'instructions', label: 'Instructions', status: 'success', total: 100 }),
];

const start = (items: IUploadItem[]) => {
  let toastId = '';

  act(() => {
    toastId = toaster.uploads.start({
      title: 'Please wait...',
      description: 'Uploading content images...',
      items,
    });
  });

  return toastId;
};

const patch = (toastId: string, itemId: string, changes: Partial<IUploadItem>) => {
  act(() => {
    toaster.uploads.update(toastId, itemId, changes);
  });
};

const advance = (ms: number) => {
  act(() => {
    vi.advanceTimersByTime(ms);
  });
};

const rows = (container: HTMLElement) => [...container.querySelectorAll<HTMLElement>('li')];
const text = (container: HTMLElement) => container.textContent;

describe('the uploads toast', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    useToastStore.setState({ toasts: [] });
  });

  afterEach(() => {
    unmountAll();
    vi.useRealTimers();
    document.body.replaceChildren();
  });

  it('shows the overall progress on the left, and how many files are through', () => {
    const view = mount(<ToastContainer />);

    start(contentUploads());

    expect(text(view.container)).toContain('Please wait...');
    expect(text(view.container)).toContain('Uploading content images...');
    expect(text(view.container)).toContain('2 of 6 uploaded'); // 1 of the description + the instructions
    expect(view.container.querySelector('svg text')?.textContent).toBe('42%'); // 250 of 600 bytes
  });

  it('shows a row for every upload when there are several, each with its own state', () => {
    const view = mount(<ToastContainer />);

    start(contentUploads());

    const items = rows(view.container);

    expect(items.map((item) => item.dataset.status)).toEqual(['uploading', 'pending', 'success']);
    expect(items.map((item) => item.querySelector('span')?.textContent)).toEqual([
      'Description',
      'Ingredients',
      'Instructions',
    ]);
    expect(items.map((item) => item.textContent)).toEqual([
      'Description1/3',
      'Ingredients0/2',
      'Instructions1/1',
    ]);
    expect(
      items.map((item) =>
        item.querySelector('[role="progressbar"]')?.getAttribute('aria-valuenow'),
      ),
    ).toEqual(['50', '0', '100']);
  });

  it('turns the icon of an upload that is going on by itself, not with css', () => {
    const view = mount(<ToastContainer />);

    start(contentUploads());

    const row = rows(view.container).find((item) => item.dataset.status === 'uploading');
    const icon = row?.querySelector('svg');

    expect(icon?.getAttribute('class')).not.toContain('animate-spin');
    expect(icon?.innerHTML).toContain('<animateTransform');
  });

  it('shows no rows for a single upload, only the summary', () => {
    const view = mount(<ToastContainer />);

    start([
      row({
        id: 'files',
        label: 'Uploading images',
        status: 'uploading',
        loaded: 250,
        total: 600,
        fileSizes: [100, 200, 300],
      }),
    ]);

    expect(rows(view.container)).toHaveLength(0);
    expect(view.container.querySelector('[role="progressbar"]')).toBeNull();
    expect(text(view.container)).toContain('1 of 3 uploaded');
  });

  it('follows the uploads as they go', () => {
    const view = mount(<ToastContainer />);
    const toastId = start(contentUploads());

    patch(toastId, 'description', { loaded: 300 });
    patch(toastId, 'ingredients', { status: 'uploading', loaded: 100, total: 200 });

    expect(rows(view.container).map((item) => item.dataset.status)).toEqual([
      'uploading',
      'uploading',
      'success',
    ]);
    expect(text(view.container)).toContain('4 of 6 uploaded'); // description 2, ingredients 1, instructions 1
  });

  it('cannot be closed, and does not close, while something is still uploading', () => {
    const view = mount(<ToastContainer />);

    start(contentUploads());
    advance(60_000);

    expect(text(view.container)).toContain('Please wait...');
    expect(view.container.innerHTML).not.toContain('M18 6L6 18'); // no close "x"
  });

  it('says everything is uploaded, then closes by itself', () => {
    const view = mount(<ToastContainer />);
    const toastId = start(contentUploads());

    patch(toastId, 'description', { status: 'success' });
    patch(toastId, 'ingredients', { status: 'success' });

    expect(text(view.container)).toContain('Upload complete'); // no more "Please wait..."
    expect(text(view.container)).not.toContain('Please wait...');
    expect(text(view.container)).toContain('All 6 uploaded');
    expect(view.container.querySelector('svg text')?.textContent).toBe('100%');
    expect(view.container.innerHTML).toContain('M18 6L6 18'); // it can be closed now

    advance(2500 + 300 + 100);

    expect(view.container.querySelector('li')).toBeNull();
    expect(useToastStore.getState().toasts).toEqual([]);
  });

  it('says "Uploaded" for a single file that is through', () => {
    const view = mount(<ToastContainer />);

    start([row({ id: 'files', label: 'Thumbnail', status: 'success' })]);

    expect(text(view.container)).toContain('Upload complete');
    expect(text(view.container)).toContain('Uploaded');
    expect(text(view.container)).not.toContain('All 1');
  });

  it('shows what failed, and stays longer so it can be read', () => {
    const view = mount(<ToastContainer />);
    const toastId = start(contentUploads());

    patch(toastId, 'description', { status: 'error' });
    patch(toastId, 'ingredients', { status: 'success' });

    expect(text(view.container)).toContain('Some uploads failed');
    expect(text(view.container)).toContain('3 of 6 uploaded, 1 failed'); // description 0 (failed), ingredients 2, instructions 1
    expect(rows(view.container).map((item) => item.dataset.status)).toEqual([
      'error',
      'success',
      'success',
    ]);

    advance(2500 + 300 + 100);
    expect(text(view.container)).toContain('1 failed'); // still there after the usual time

    advance(8000);
    expect(useToastStore.getState().toasts).toEqual([]);
  });

  it('says the upload failed when every upload failed', () => {
    const view = mount(<ToastContainer />);

    start([row({ id: 'files', label: 'Images', status: 'error', fileSizes: [100, 100] })]);

    expect(text(view.container)).toContain('Upload failed');
    expect(text(view.container)).toContain('0 of 2 uploaded, 1 failed');
  });
});
