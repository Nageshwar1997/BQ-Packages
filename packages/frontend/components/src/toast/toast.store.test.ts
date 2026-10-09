import { beforeEach, describe, expect, it } from 'vitest';

import { useToastStore } from './toast.store.js';
import type { IUploadItem } from './types.js';

const row = (id: string): IUploadItem => ({
  id,
  label: id,
  status: 'pending',
  loaded: 0,
  total: 10,
  fileSizes: [10],
});

const { add, update } = useToastStore.getState();

const itemsOf = (toastId: string) => {
  const toast = useToastStore.getState().toasts.find(({ id }) => id === toastId);

  return toast?.type === 'uploads' ? toast.items : undefined;
};

describe('the uploadItem update of the toast store', () => {
  beforeEach(() => {
    useToastStore.setState({ toasts: [] });
  });

  it('changes only the upload that was named, in the toast that was named', () => {
    const first = add({ type: 'uploads', title: 'First', items: [row('a'), row('b')] });
    const second = add({ type: 'uploads', title: 'Second', items: [row('a'), row('b')] });

    update.uploadItem(first, 'b', { status: 'uploading', loaded: 4 });

    expect(itemsOf(first)).toEqual([row('a'), { ...row('b'), status: 'uploading', loaded: 4 }]);
    expect(itemsOf(second)).toEqual([row('a'), row('b')]);
  });

  it('leaves other kinds of toast alone, even with the same id', () => {
    const progress = add({ type: 'progress', title: 'Uploading', progress: 10 });
    const other = useToastStore.getState().toasts;

    update.uploadItem(progress, 'a', { status: 'success' });

    expect(useToastStore.getState().toasts).toEqual(other);
  });

  it('does nothing for a toast that is gone, or a row that does not exist', () => {
    const toastId = add({ type: 'uploads', title: 'Uploads', items: [row('a')] });

    update.uploadItem('gone', 'a', { status: 'success' });
    update.uploadItem(toastId, 'missing', { status: 'success' });

    expect(itemsOf(toastId)).toEqual([row('a')]);
  });
});
