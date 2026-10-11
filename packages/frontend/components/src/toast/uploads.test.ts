// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';

import type { IUploadItem } from './types.js';
import {
  getFormDataFiles,
  getUploadItemFilesDone,
  getUploadItemPercent,
  getUploadsSummary,
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
