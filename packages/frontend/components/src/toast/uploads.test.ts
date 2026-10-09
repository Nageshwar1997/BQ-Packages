// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';

import { useToastStore } from './toast.store.js';
import type { IUploadItem, TUploadProgressEvent } from './types.js';
import {
  createUploadsToast,
  getFormDataFiles,
  getUploadItemFilesDone,
  getUploadItemPercent,
  getUploadsSummary,
  runUploadsInToast,
  withUploadsToast,
} from './uploads.js';

const file = (name: string, size: number) => new File([new Uint8Array(size)], name);

const item = (patch: Partial<IUploadItem> = {}): IUploadItem => ({
  id: 'a',
  label: 'A',
  status: 'uploading',
  loaded: 0,
  total: 100,
  fileSizes: [100],
  ...patch,
});

const progressEvent = (loaded: number, total?: number) =>
  ({ loaded, total }) satisfies TUploadProgressEvent;

/** The uploads toast that is on screen. */
const uploadsToast = () => {
  const toast = useToastStore.getState().toasts.find(({ type }) => type === 'uploads');

  if (toast?.type !== 'uploads') throw new Error('There is no uploads toast');

  return toast;
};

const rowOf = (id: string) => {
  const row = uploadsToast().items.find((candidate) => candidate.id === id);

  if (!row) throw new Error(`There is no row ${id}`);

  return row;
};

/** A promise that is settled by hand, to decide when an upload is over. */
const deferred = <T>() => {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return { promise, resolve, reject };
};

beforeEach(() => {
  useToastStore.setState({ toasts: [] });
});

describe('getUploadItemFilesDone', () => {
  it('counts every file of an upload the server has answered', () => {
    expect(getUploadItemFilesDone(item({ status: 'success', fileSizes: [1, 2, 3] }))).toBe(3);
  });

  it('counts none of a waiting upload or of a failed one', () => {
    expect(getUploadItemFilesDone(item({ status: 'pending', fileSizes: [1, 2] }))).toBe(0);
    expect(
      getUploadItemFilesDone(item({ status: 'error', loaded: 50, fileSizes: [10, 20, 30] })),
    ).toBe(0);
  });

  it('counts the files that were completely sent while the upload goes on', () => {
    const sizes = [10, 20, 30, 40];

    expect(getUploadItemFilesDone(item({ loaded: 9, fileSizes: sizes }))).toBe(0);
    expect(getUploadItemFilesDone(item({ loaded: 10, fileSizes: sizes }))).toBe(1);
    expect(getUploadItemFilesDone(item({ loaded: 59, fileSizes: sizes }))).toBe(2);
    expect(getUploadItemFilesDone(item({ loaded: 60, fileSizes: sizes }))).toBe(3);
  });

  it('never counts the last file before the server has answered', () => {
    expect(getUploadItemFilesDone(item({ loaded: 100, fileSizes: [10, 20, 30, 40] }))).toBe(3);
    expect(getUploadItemFilesDone(item({ loaded: 100, fileSizes: [100] }))).toBe(0);
  });

  it('has nothing to count without files', () => {
    expect(getUploadItemFilesDone(item({ loaded: 0, fileSizes: [] }))).toBe(0);
  });
});

describe('getUploadItemPercent', () => {
  it('is 0 for an upload that has not started or does not know its size', () => {
    expect(getUploadItemPercent(item({ status: 'pending' }))).toBe(0);
    expect(getUploadItemPercent(item({ loaded: 10, total: 0 }))).toBe(0);
  });

  it('follows the bytes sent', () => {
    expect(getUploadItemPercent(item({ loaded: 25, total: 100 }))).toBe(25);
    expect(getUploadItemPercent(item({ loaded: 1, total: 3 }))).toBe(33);
  });

  it('stays below 100 until the server has answered', () => {
    expect(getUploadItemPercent(item({ loaded: 100, total: 100 }))).toBe(99);
    expect(getUploadItemPercent(item({ loaded: 120, total: 100 }))).toBe(99);
    expect(getUploadItemPercent(item({ status: 'success' }))).toBe(100);
  });
});

describe('getUploadsSummary', () => {
  it('weighs every upload by its size', () => {
    const summary = getUploadsSummary([
      item({ id: 'a', loaded: 50, total: 100 }),
      item({ id: 'b', status: 'pending', loaded: 0, total: 300 }),
    ]);

    expect(summary.percent).toBe(13); // 50 of 400 bytes
    expect(summary.isSettled).toBe(false);
  });

  it('counts a finished upload as fully sent', () => {
    const summary = getUploadsSummary([
      item({ id: 'a', status: 'success', loaded: 0, total: 100 }),
      item({ id: 'b', loaded: 100, total: 300 }),
    ]);

    expect(summary.percent).toBe(50);
  });

  it('is 100 only when every upload has succeeded', () => {
    const almost = getUploadsSummary([
      item({ id: 'a', status: 'success' }),
      item({ id: 'b', loaded: 100, total: 100 }),
    ]);
    const done = getUploadsSummary([
      item({ id: 'a', status: 'success' }),
      item({ id: 'b', status: 'success' }),
    ]);

    expect(almost.percent).toBe(99);
    expect(done).toMatchObject({ percent: 100, failed: 0, isSettled: true });
  });

  it('is settled, with the failures counted, when the last upload fails', () => {
    const summary = getUploadsSummary([
      item({ id: 'a', status: 'success', total: 100 }),
      item({ id: 'b', status: 'error', loaded: 0, total: 100 }),
    ]);

    expect(summary).toMatchObject({ percent: 50, failed: 1, isSettled: true });
  });

  it('adds up the files of all uploads', () => {
    const summary = getUploadsSummary([
      item({ id: 'a', status: 'success', fileSizes: [1, 1, 1] }),
      item({ id: 'b', status: 'pending', fileSizes: [1, 1] }),
      item({ id: 'c', loaded: 1, total: 3, fileSizes: [1, 1, 1] }),
    ]);

    expect(summary.filesTotal).toBe(8);
    expect(summary.filesDone).toBe(4); // 3 + 0 + 1
  });

  it('does not divide by zero when no size is known', () => {
    expect(getUploadsSummary([item({ status: 'pending', total: 0, fileSizes: [] })]).percent).toBe(
      0,
    );
    expect(getUploadsSummary([item({ status: 'success', total: 0, fileSizes: [] })]).percent).toBe(
      100,
    );
  });
});

describe('getFormDataFiles', () => {
  it('gives the files in the order they were added, and nothing else', () => {
    const data = new FormData();
    const first = file('1.png', 1);
    const second = file('2.png', 2);

    data.append('files', first);
    data.append('folder', 'Lipstick');
    data.append('files', second);

    expect(getFormDataFiles(data)).toEqual([first, second]);
  });

  it('can read another key', () => {
    const data = new FormData();
    const single = file('1.png', 1);

    data.append('file', single);

    expect(getFormDataFiles(data)).toEqual([]);
    expect(getFormDataFiles(data, 'file')).toEqual([single]);
  });
});

describe('createUploadsToast', () => {
  it('shows no toast when there is nothing to upload', () => {
    expect(createUploadsToast({ title: 'Wait', items: [] })).toBeUndefined();
    expect(useToastStore.getState().toasts).toEqual([]);
  });

  it('opens one toast with a waiting row for every upload', () => {
    createUploadsToast({
      title: 'Please wait...',
      description: 'Uploading content images...',
      items: [
        { id: 'description', label: 'Description', files: [file('a.png', 10), file('b.png', 20)] },
        { id: 'ingredients', label: 'Ingredients', files: [file('c.png', 5)] },
      ],
    });

    expect(useToastStore.getState().toasts).toHaveLength(1);
    expect(uploadsToast()).toMatchObject({
      title: 'Please wait...',
      description: 'Uploading content images...',
      items: [
        {
          id: 'description',
          label: 'Description',
          status: 'pending',
          loaded: 0,
          total: 30,
          fileSizes: [10, 20],
        },
        {
          id: 'ingredients',
          label: 'Ingredients',
          status: 'pending',
          loaded: 0,
          total: 5,
          fileSizes: [5],
        },
      ],
    });
  });

  it('shows an upload as uploading while it runs, follows its progress, and shows it as done', async () => {
    const group = createUploadsToast({
      title: 'Wait',
      items: [{ id: 'a', label: 'A', files: [file('a.png', 100)] }],
    });
    const request = deferred<string>();
    let onProgress: ((event: TUploadProgressEvent) => void) | undefined;

    const upload = group?.item('a').run((handler) => {
      onProgress = handler;

      return request.promise;
    });

    expect(rowOf('a').status).toBe('uploading');

    onProgress?.(progressEvent(40, 120));
    expect(rowOf('a')).toMatchObject({ loaded: 40, total: 120 });

    request.resolve('https://cdn/a.png');

    await expect(upload).resolves.toBe('https://cdn/a.png');
    expect(rowOf('a').status).toBe('success');
  });

  it('keeps its own size estimate when the browser does not know the total', () => {
    const group = createUploadsToast({
      title: 'Wait',
      items: [{ id: 'a', label: 'A', files: [file('a.png', 100)] }],
    });
    let onProgress: ((event: TUploadProgressEvent) => void) | undefined;

    void group?.item('a').run((handler) => {
      onProgress = handler;

      return new Promise<void>(() => undefined);
    });

    onProgress?.(progressEvent(40, undefined));

    expect(rowOf('a')).toMatchObject({ loaded: 0, total: 100 });
  });

  it('shows an upload as failed and throws the very same error', async () => {
    const group = createUploadsToast({
      title: 'Wait',
      items: [
        { id: 'a', label: 'A', files: [file('a.png', 1)] },
        { id: 'b', label: 'B', files: [file('b.png', 1)] },
      ],
    });
    const failure = new Error('Too large');

    await expect(group?.item('a').run(() => Promise.reject(failure))).rejects.toBe(failure);

    expect(rowOf('a').status).toBe('error');
    expect(rowOf('b').status).toBe('pending');
  });

  it('shows what never ran, or never finished, as failed when it ends', async () => {
    const group = createUploadsToast({
      title: 'Wait',
      items: [
        { id: 'done', label: 'Done', files: [file('a.png', 1)] },
        { id: 'running', label: 'Running', files: [file('b.png', 1)] },
        { id: 'never', label: 'Never', files: [file('c.png', 1)] },
      ],
    });

    await group?.item('done').run(() => Promise.resolve());
    void group?.item('running').run(() => new Promise<void>(() => undefined));

    group?.end();

    expect(rowOf('done').status).toBe('success');
    expect(rowOf('running').status).toBe('error');
    expect(rowOf('never').status).toBe('error');
  });

  it('leaves the toast alone when its rows are removed in the meantime', async () => {
    const group = createUploadsToast({
      title: 'Wait',
      items: [{ id: 'a', label: 'A', files: [file('a.png', 1)] }],
    });

    useToastStore.setState({ toasts: [] }); // the toast is closed by the user

    await expect(group?.item('a').run(() => Promise.resolve('ok'))).resolves.toBe('ok');
    expect(useToastStore.getState().toasts).toEqual([]);
  });
});

describe('withUploadsToast', () => {
  it('just makes the request when there are no files', async () => {
    const result = await withUploadsToast({
      title: 'Wait',
      files: [],
      request: () => Promise.resolve('answer'),
    });

    expect(result).toBe('answer');
    expect(useToastStore.getState().toasts).toEqual([]);
  });

  it('shows the upload in one toast and gives back the answer', async () => {
    const request = deferred<string[]>();
    const upload = withUploadsToast({
      title: 'Please wait...',
      description: 'Uploading images',
      files: [file('a.png', 10), file('b.png', 10), file('c.png', 10)],
      request: () => request.promise,
    });

    expect(uploadsToast()).toMatchObject({
      title: 'Please wait...',
      description: 'Uploading images',
    });
    expect(rowOf('files')).toMatchObject({ status: 'uploading', fileSizes: [10, 10, 10] });

    request.resolve(['1', '2', '3']);

    await expect(upload).resolves.toEqual(['1', '2', '3']);
    expect(rowOf('files').status).toBe('success');
  });

  it('shows the upload as failed when the request fails', async () => {
    const failure = new Error('Network Error');

    await expect(
      withUploadsToast({
        title: 'Wait',
        files: [file('a.png', 1)],
        request: () => Promise.reject(failure),
      }),
    ).rejects.toBe(failure);

    expect(rowOf('files').status).toBe('error');
  });
});

describe('runUploadsInToast', () => {
  const uploads = (withFiles: string[], all = ['description', 'additional', 'ingredients']) =>
    all.map((id) => ({
      id,
      label: id.toUpperCase(),
      files: withFiles.includes(id) ? [file(`${id}.png`, 10)] : [],
    }));

  it('opens one toast with a row only for the fields that have files', async () => {
    const gate = deferred<undefined>();

    const outcome = runUploadsInToast({
      title: 'Wait',
      description: 'Uploading content images...',
      uploads: uploads(['description', 'ingredients']),
      run: (_id, progress) => progress?.run(() => gate.promise) ?? Promise.resolve(),
    });

    expect(useToastStore.getState().toasts).toHaveLength(1);
    expect(uploadsToast().description).toBe('Uploading content images...');
    expect(uploadsToast().items.map(({ id, label }) => [id, label])).toEqual([
      ['description', 'DESCRIPTION'],
      ['ingredients', 'INGREDIENTS'],
    ]);

    gate.resolve(undefined);
    await outcome;
  });

  it('gives every field its own row to upload with, and the results by field', async () => {
    const handles: Record<string, unknown> = {};

    const results = await runUploadsInToast({
      title: 'Wait',
      uploads: uploads(['description', 'ingredients']),
      run: async (id, progress) => {
        handles[id] = progress;

        if (progress) await progress.run(() => Promise.resolve());

        return `${id} done`;
      },
    });

    expect(results).toEqual({
      description: 'description done',
      additional: 'additional done',
      ingredients: 'ingredients done',
    });
    expect(uploadsToast().items.map(({ id, status }) => [id, status])).toEqual([
      ['description', 'success'],
      ['ingredients', 'success'],
    ]);
    expect(Object.values(handles).every(Boolean)).toBe(true);
  });

  it('shows a field whose upload never ran as failed once everything is over', async () => {
    await runUploadsInToast({
      title: 'Wait',
      uploads: uploads(['description', 'ingredients']),
      // `description` has files, but its upload does not use its row: it never runs
      run: (id, progress) =>
        id === 'ingredients'
          ? (progress?.run(() => Promise.resolve()) ?? Promise.resolve())
          : Promise.resolve(),
    });

    expect(uploadsToast().items.map(({ id, status }) => [id, status])).toEqual([
      ['description', 'error'],
      ['ingredients', 'success'],
    ]);
  });

  it('shows no toast at all when no field has files', async () => {
    const seen: unknown[] = [];

    const results = await runUploadsInToast({
      title: 'Wait',
      uploads: uploads([]),
      run: (id, progress) => {
        seen.push(progress);

        return Promise.resolve(id);
      },
    });

    expect(useToastStore.getState().toasts).toEqual([]);
    expect(seen).toEqual([undefined, undefined, undefined]);
    expect(results).toEqual({
      description: 'description',
      additional: 'additional',
      ingredients: 'ingredients',
    });
  });

  it('waits for the others when one fails, then throws that error', async () => {
    const slow = deferred<undefined>();
    const failure = new Error('Too large');
    let settled = false;

    const outcome = runUploadsInToast({
      title: 'Wait',
      uploads: uploads(['description', 'ingredients']),
      run: (id, progress) => {
        if (id === 'description')
          return progress?.run(() => Promise.reject(failure)) ?? Promise.resolve();
        if (id === 'ingredients') return progress?.run(() => slow.promise) ?? Promise.resolve();

        return Promise.resolve();
      },
    }).then(
      () => 'resolved',
      (error: unknown) => {
        settled = true;

        return error;
      },
    );

    await Promise.resolve();
    await Promise.resolve();

    expect(settled).toBe(false); // the other upload is still going
    expect(rowOf('description').status).toBe('error');
    expect(rowOf('ingredients').status).toBe('uploading');

    slow.resolve(undefined);

    await expect(outcome).resolves.toBe(failure);
    expect(rowOf('ingredients').status).toBe('success'); // it was not shown as failed because of the other
  });

  it('throws an error of its own when something that is not an error was thrown', async () => {
    await expect(
      runUploadsInToast({
        title: 'Wait',
        uploads: uploads(['description']),
        // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors
        run: () => Promise.reject('plain text'),
      }),
    ).rejects.toThrow('Upload failed');
  });
});
