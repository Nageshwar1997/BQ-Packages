import { create } from 'zustand';

import { createId } from './id.js';
import type { TStoreHook } from './types.js';

/** What the store has to know of the toasts of the app: that each one has a `type`. */
export interface IToastLike {
  type: string;
}

/** The toast that `update.progress` changes: the one with the type `'progress'` and a `progress`. */
interface IProgressToastLike extends IToastLike {
  type: 'progress';
  progress: number;
}

/** One upload of an uploads toast: the only thing the store needs of it is its `id`. */
export interface IUploadItemLike {
  id: string;
}

/** The toast that `update.uploadItem` changes: the one with the type `'uploads'` and its `items`. */
interface IUploadsToastLike extends IToastLike {
  type: 'uploads';
  items: IUploadItemLike[];
}

/** A toast of the app as the store keeps it: with the `id` the store gave it. */
export type TToastItemOf<TToast extends IToastLike> = TToast & { id: string };

type TUploadsToastOf<TToast extends IToastLike> = Extract<TToast, { type: 'uploads' }>;

/**
 * The uploads of the uploads toast of the app, or `never` when the app has none (the brackets
 * keep `never` from being taken for "any toast", which would make it `unknown`).
 */
export type TUploadItemOf<TToast extends IToastLike> = [TUploadsToastOf<TToast>] extends [never]
  ? never
  : TUploadsToastOf<TToast> extends { items: (infer TItem)[] }
    ? TItem
    : never;

export interface IToastStore<TToast extends IToastLike> {
  /** The toasts that are shown, the oldest first. */
  toasts: TToastItemOf<TToast>[];
  /** Shows a toast and gives its id, to remove it or to change it later. */
  add: (toast: TToast) => string;
  update: {
    /** Changes how far a toast of the type `'progress'` is. Any other toast is left as it is. */
    progress: (id: string, progress: number) => void;
    /** Changes one upload (`itemId`) of a toast of the type `'uploads'`. Any other toast is left as it is. */
    uploadItem: (
      id: string,
      itemId: string,
      patch: Partial<Omit<TUploadItemOf<TToast>, 'id'>>,
    ) => void;
  };
  remove: (id: string) => void;
}

export type TToastStoreHook<TToast extends IToastLike> = TStoreHook<IToastStore<TToast>>;

const isProgress = (toast: IToastLike): toast is IProgressToastLike => toast.type === 'progress';

const isUploads = (toast: IToastLike): toast is IUploadsToastLike => toast.type === 'uploads';

/**
 * The toast store. The app (or the package that shows the toasts) gives the type of its toasts, a
 * union with one `type` for each kind, and makes the store once, in a module, exporting what it
 * gives back: a store made twice is two stores, and a toast added to one is never shown by the
 * container that reads the other.
 *
 * ```ts
 * export const useToastStore = createToastStore<TToast>();
 * ```
 */
export const createToastStore = <TToast extends IToastLike>(): TToastStoreHook<TToast> =>
  create<IToastStore<TToast>>((set) => ({
    toasts: [],

    add: (toast) => {
      const id = createId('toast');

      set((state) => ({ toasts: [...state.toasts, { ...toast, id }] }));

      return id; // for removing, or changing, the toast later
    },

    update: {
      progress: (id, progress) => {
        set((state) => ({
          toasts: state.toasts.map((toast) =>
            toast.id === id && isProgress(toast) ? { ...toast, progress } : toast,
          ),
        }));
      },

      uploadItem: (id, itemId, patch) => {
        set((state) => ({
          toasts: state.toasts.map((toast) =>
            toast.id === id && isUploads(toast)
              ? {
                  ...toast,
                  items: toast.items.map((item) =>
                    item.id === itemId ? { ...item, ...patch } : item,
                  ),
                }
              : toast,
          ),
        }));
      },
    },

    remove: (id) => {
      set((state) => ({ toasts: state.toasts.filter((toast) => toast.id !== id) }));
    },
  }));
