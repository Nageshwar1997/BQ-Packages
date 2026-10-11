// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';

import { createToastStore } from './toast.store.js';

// The toasts of an app, as the app would give them: a union with one `type` for each kind.
interface IUploadItem {
  id: string;
  label: string;
  status: 'pending' | 'uploading' | 'success';
  loaded: number;
  total: number;
}

type TToast =
  | { type: 'success'; title: string; description?: string }
  | { type: 'progress'; title: string; progress: number }
  | { type: 'uploads'; title: string; items: IUploadItem[] };

const row = (id: string): IUploadItem => ({
  id,
  label: id,
  status: 'pending',
  loaded: 0,
  total: 10,
});

const newStore = () => createToastStore<TToast>();

const itemsOf = (store: ReturnType<typeof newStore>, toastId: string) => {
  const toast = store.getState().toasts.find(({ id }) => id === toastId);

  return toast?.type === 'uploads' ? toast.items : undefined;
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('createToastStore', () => {
  describe('add', () => {
    it('starts with no toasts', () => {
      expect(newStore().getState().toasts).toEqual([]);
    });

    it('shows the toast with an id of its own and gives the id', () => {
      const store = newStore();
      const id = store.getState().add({ type: 'success', title: 'Saved', description: 'Done' });

      expect(store.getState().toasts).toEqual([
        { id, type: 'success', title: 'Saved', description: 'Done' },
      ]);
    });

    it('keeps the toasts in the order they were added, each with a different id', () => {
      const store = newStore();
      const first = store.getState().add({ type: 'success', title: 'First' });
      const second = store.getState().add({ type: 'success', title: 'Second' });

      expect(first).not.toBe(second);
      expect(store.getState().toasts.map(({ id }) => id)).toEqual([first, second]);
    });

    it('gives ids even where `crypto.randomUUID` does not exist (a page that is not https)', () => {
      vi.stubGlobal('crypto', {});
      const store = newStore();
      const ids = [1, 2, 3].map(() => store.getState().add({ type: 'success', title: 'Toast' }));

      expect(new Set(ids).size).toBe(3);
    });

    it('tells its subscribers', () => {
      const store = newStore();
      const listener = vi.fn();

      store.subscribe(listener);
      store.getState().add({ type: 'success', title: 'Saved' });

      expect(listener).toHaveBeenCalledTimes(1);
    });
  });

  describe('remove', () => {
    it('removes the toast with that id and leaves the others', () => {
      const store = newStore();
      const first = store.getState().add({ type: 'success', title: 'First' });
      const second = store.getState().add({ type: 'success', title: 'Second' });

      store.getState().remove(first);

      expect(store.getState().toasts.map(({ id }) => id)).toEqual([second]);
    });

    it('does nothing for an id that is not there', () => {
      const store = newStore();

      store.getState().add({ type: 'success', title: 'First' });
      const before = store.getState().toasts;

      store.getState().remove('gone');

      expect(store.getState().toasts).toEqual(before);
    });
  });

  describe('update.progress', () => {
    it('changes how far that toast is, and nothing else of it', () => {
      const store = newStore();
      const id = store.getState().add({ type: 'progress', title: 'Uploading', progress: 0 });

      store.getState().update.progress(id, 40);

      expect(store.getState().toasts).toEqual([
        { id, type: 'progress', title: 'Uploading', progress: 40 },
      ]);
    });

    it('does not touch the other toasts', () => {
      const store = newStore();
      const first = store.getState().add({ type: 'progress', title: 'One', progress: 0 });
      const second = store.getState().add({ type: 'progress', title: 'Two', progress: 5 });
      const other = store.getState().toasts[1];

      store.getState().update.progress(first, 90);

      expect(store.getState().toasts[1]).toBe(other); // the very same object: nothing was copied
      expect(store.getState().toasts[1]?.id).toBe(second);
    });

    it('leaves a toast that is not a progress toast alone, even with the same id', () => {
      const store = newStore();
      const id = store.getState().add({ type: 'success', title: 'Saved' });

      store.getState().update.progress(id, 50);

      expect(store.getState().toasts).toEqual([{ id, type: 'success', title: 'Saved' }]);
    });

    it('does nothing for a toast that is gone', () => {
      const store = newStore();

      store.getState().add({ type: 'progress', title: 'Uploading', progress: 10 });
      const before = store.getState().toasts;

      store.getState().update.progress('gone', 90);

      expect(store.getState().toasts).toEqual(before);
    });
  });

  describe('update.uploadItem', () => {
    it('changes only the upload that was named, in the toast that was named', () => {
      const store = newStore();
      const first = store
        .getState()
        .add({ type: 'uploads', title: 'First', items: [row('a'), row('b')] });
      const second = store
        .getState()
        .add({ type: 'uploads', title: 'Second', items: [row('a'), row('b')] });

      store.getState().update.uploadItem(first, 'b', { status: 'uploading', loaded: 4 });

      expect(itemsOf(store, first)).toEqual([
        row('a'),
        { ...row('b'), status: 'uploading', loaded: 4 },
      ]);
      expect(itemsOf(store, second)).toEqual([row('a'), row('b')]);
    });

    it('leaves other kinds of toast alone, even with the same id', () => {
      const store = newStore();
      const progress = store.getState().add({ type: 'progress', title: 'Uploading', progress: 10 });
      const before = store.getState().toasts;

      store.getState().update.uploadItem(progress, 'a', { status: 'success' });

      expect(store.getState().toasts).toEqual(before);
    });

    it('does nothing for a toast that is gone, or a row that does not exist', () => {
      const store = newStore();
      const toastId = store
        .getState()
        .add({ type: 'uploads', title: 'Uploads', items: [row('a')] });

      store.getState().update.uploadItem('gone', 'a', { status: 'success' });
      store.getState().update.uploadItem(toastId, 'missing', { status: 'success' });

      expect(itemsOf(store, toastId)).toEqual([row('a')]);
    });

    it('keeps the id of the upload, whatever the patch says', () => {
      const store = newStore();
      const toastId = store
        .getState()
        .add({ type: 'uploads', title: 'Uploads', items: [row('a')] });

      store.getState().update.uploadItem(toastId, 'a', { label: 'renamed' });

      expect(itemsOf(store, toastId)?.[0]).toMatchObject({ id: 'a', label: 'renamed' });
    });
  });

  it('makes a store of its own each time it is called', () => {
    const first = newStore();
    const second = newStore();

    first.getState().add({ type: 'success', title: 'Saved' });

    expect(second.getState().toasts).toEqual([]);
  });
});
