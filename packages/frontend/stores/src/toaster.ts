import type { IToastLike, TToastStoreHook, TUploadItemOf } from './toast.store.js';

/** What the browser tells about the progress of an upload (an `AxiosProgressEvent` fits). */
export interface TUploadProgressEvent {
  loaded: number;
  total?: number;
}

export type TUploadProgressHandler = (event: TUploadProgressEvent) => void;

export type TUploadItemStatus = 'pending' | 'uploading' | 'success' | 'error';

/** One upload (a request) of an uploads toast, e.g. "Description" with the images of that field. */
export interface IUploadItem {
  id: string;
  label: string;
  status: TUploadItemStatus;
  /** Bytes the browser has sent so far, and the bytes to send (the sum of the file sizes until known). */
  loaded: number;
  total: number;
  /** The size of every file of this upload, in the order they are sent. */
  fileSizes: number[];
}

export interface IUploadItemHandle {
  /**
   * Runs the upload: shows it as uploading, follows its progress, shows it as done or failed, and
   * gives back what the request gave back (or throws what it threw).
   */
  run: <T>(request: (onProgress: TUploadProgressHandler) => Promise<T>) => Promise<T>;
}

export interface IUploadGroup {
  item: (id: string) => IUploadItemHandle;
  /** Call when the uploads are over: an upload that never ran (or never finished) shows as failed. */
  end: () => void;
}

export interface IUploadGroupOptions {
  title: string;
  description?: string;
  items: { id: string; label: string; files: File[] }[];
}

/** The toasts of the app that are of the kind `TKind` (`'success'`, `'progress'`, ...). */
export type TToastOfType<TToast extends IToastLike, TKind extends string> = TToast extends {
  type: infer TType;
}
  ? [TKind] extends [TType]
    ? TToast
    : never
  : never;

/** What a toast of the kind `TKind` is made of, without its `type` (the toaster puts that in). */
export type TToastData<TToast extends IToastLike, TKind extends string> = Omit<
  TToastOfType<TToast, TKind>,
  'type'
>;

/** What `withProgressToast` takes: the title (and description) of the progress toast of the app, and the request. */
export type TProgressToastOptions<TToast extends IToastLike, T> = Pick<
  TToastData<TToast, 'progress'>,
  Extract<'title' | 'description', keyof TToastData<TToast, 'progress'>>
> & {
  request: (onProgress: TUploadProgressHandler) => Promise<T>;
};

/** Shows toasts in a store: `toaster.success({ title })`, `toaster.remove(id)`, ... */
export interface IToaster<TToast extends IToastLike> {
  success: (data: TToastData<TToast, 'success'>) => string;
  error: (data: TToastData<TToast, 'error'>) => string;
  warning: (data: TToastData<TToast, 'warning'>) => string;
  default: (data: TToastData<TToast, 'default'>) => string;
  loading: (data: TToastData<TToast, 'loading'>) => string;
  /** A toast with content of its own: `{ type: 'custom', children }`. */
  custom: (data: TToastOfType<TToast, 'custom'>) => string;
  progress: {
    start: (data: TToastData<TToast, 'progress'>) => string;
    update: (toastId: string, progress: number) => void;
    end: (toastId: string) => void;
  };
  uploads: {
    start: (data: TToastData<TToast, 'uploads'>) => string;
    update: (
      toastId: string,
      itemId: string,
      patch: Partial<Omit<TUploadItemOf<TToast>, 'id'>>,
    ) => void;
  };
  remove: (toastId: string) => void;
}

/** The toaster, and the helpers for toasts that follow a request or several uploads. */
export interface IToasterKit<TToast extends IToastLike> {
  toaster: IToaster<TToast>;
  /** The toast for a request: it follows the progress that the request tells, and goes when it is over. */
  withProgressToast: <T>(options: TProgressToastOptions<TToast, T>) => Promise<T>;
  /**
   * Opens one toast for the uploads of `items`. It closes by itself a moment after every upload is
   * over. Returns nothing when there is nothing to upload, so no empty toast is shown.
   */
  createUploadsToast: (options: IUploadGroupOptions) => IUploadGroup | undefined;
  /** The toast for a single request that uploads several files at once. */
  withUploadsToast: <T>(options: {
    title: string;
    description?: string;
    files: File[];
    request: (onProgress: TUploadProgressHandler) => Promise<T>;
  }) => Promise<T>;
  /**
   * Runs the uploads of several fields (e.g. the images of each editor of a form step) behind one
   * toast with a row for every field that has files. `run` is called for every field, with the row
   * of that field to give to its upload (nothing when the toast has no row for it). Every upload is
   * waited for, so none is shown as failed just because another one failed; if any failed, the
   * first error is thrown once all are over.
   */
  runUploadsInToast: <TId extends string, TResult>(options: {
    title: string;
    description?: string;
    uploads: { id: TId; label: string; files: File[] }[];
    run: (id: TId, progress: IUploadItemHandle | undefined) => Promise<TResult>;
  }) => Promise<Record<TId, TResult>>;
}

const sum = (numbers: number[]) => numbers.reduce((total, value) => total + value, 0);

/**
 * Everything that shows toasts, made for one store: the `toaster`, and the helpers for toasts that
 * follow a request (`withProgressToast`) or several uploads (`withUploadsToast`,
 * `runUploadsInToast`, `createUploadsToast`). The types come from the store, so the app gives them
 * once, when it makes the store.
 *
 * The app makes the store once and gives it to this function and to whatever draws the toasts, and
 * exports what comes out for the rest of the app to import:
 *
 * ```ts
 * export const useToastStore = createToastStore<TToast>();
 * export const { toaster, withProgressToast } = createToaster(useToastStore);
 * ```
 *
 * It works from anywhere (an API client, a store), not only from components. The uploads toast of
 * the app has to be made of `IUploadItem`s.
 */
export const createToaster = <TToast extends IToastLike>(
  store: TToastStoreHook<TToast>,
): IToasterKit<TToast> => {
  const { add, update, remove } = store.getState();

  // The kinds of toast are the app's: the compiler cannot see that a toast made of `data` and the
  // `type` of its kind is one of them, so it is said here, once, and the types of `IToaster` make
  // sure `data` is what that kind is made of.
  const show = (type: string, data: object) => add({ ...data, type } as unknown as TToast);

  const toaster: IToaster<TToast> = {
    success: (data) => show('success', data),
    error: (data) => show('error', data),
    warning: (data) => show('warning', data),
    default: (data) => show('default', data),
    loading: (data) => show('loading', data),
    custom: (data) => add(data),
    progress: {
      start: (data) => show('progress', data),
      update: (toastId, progress) => {
        update.progress(toastId, progress);
      },
      end: (toastId) => {
        remove(toastId);
      },
    },
    uploads: {
      start: (data) => show('uploads', data),
      update: (toastId, itemId, patch) => {
        update.uploadItem(toastId, itemId, patch);
      },
    },
    remove: (toastId) => {
      remove(toastId);
    },
  };

  const withProgressToast = async <T>({
    request,
    ...options
  }: TProgressToastOptions<TToast, T>): Promise<T> => {
    const toastId = show('progress', { ...options, progress: 0 });

    try {
      const response = await request((event) => {
        if (!event.total) return;

        toaster.progress.update(toastId, Math.round((event.loaded * 100) / event.total));
      });

      toaster.progress.update(toastId, 100);

      return response;
    } finally {
      toaster.progress.end(toastId);
    }
  };

  const createUploadsToast: IToasterKit<TToast>['createUploadsToast'] = ({
    title,
    description,
    items,
  }) => {
    if (items.length === 0) return undefined;

    const statuses = new Map<string, TUploadItemStatus>(items.map(({ id }) => [id, 'pending']));

    const toastId = show('uploads', {
      title,
      description,
      items: items.map(({ id, label, files }): IUploadItem => {
        const fileSizes = files.map(({ size }) => size);

        return { id, label, status: 'pending', loaded: 0, total: sum(fileSizes), fileSizes };
      }),
    });

    const patch = (id: string, changes: Partial<Omit<IUploadItem, 'id'>>) => {
      if (changes.status) statuses.set(id, changes.status);

      update.uploadItem(toastId, id, changes as Partial<Omit<TUploadItemOf<TToast>, 'id'>>);
    };

    return {
      item: (id) => ({
        run: async (request) => {
          patch(id, { status: 'uploading' });

          try {
            const result = await request((event) => {
              // The browser says nothing about the total for some requests: keep the size estimate then.
              if (!event.total) return;

              patch(id, { loaded: event.loaded, total: event.total });
            });

            patch(id, { status: 'success' });

            return result;
          } catch (error) {
            patch(id, { status: 'error' });

            throw error;
          }
        },
      }),

      end: () => {
        for (const [id, status] of statuses) {
          if (status === 'pending' || status === 'uploading') patch(id, { status: 'error' });
        }
      },
    };
  };

  const withUploadsToast = async <T>({
    title,
    description,
    files,
    request,
  }: {
    title: string;
    description?: string;
    files: File[];
    request: (onProgress: TUploadProgressHandler) => Promise<T>;
  }): Promise<T> => {
    const group = createUploadsToast({
      title,
      description,
      items: files.length > 0 ? [{ id: 'files', label: description ?? title, files }] : [],
    });

    if (!group) return request(() => undefined);

    try {
      return await group.item('files').run(request);
    } finally {
      group.end();
    }
  };

  const runUploadsInToast = async <TId extends string, TResult>({
    title,
    description,
    uploads,
    run,
  }: {
    title: string;
    description?: string;
    uploads: { id: TId; label: string; files: File[] }[];
    run: (id: TId, progress: IUploadItemHandle | undefined) => Promise<TResult>;
  }): Promise<Record<TId, TResult>> => {
    const group = createUploadsToast({
      title,
      description,
      items: uploads.filter(({ files }) => files.length > 0),
    });

    const settled = await Promise.allSettled(uploads.map(({ id }) => run(id, group?.item(id))));

    group?.end();

    const results = {} as Record<TId, TResult>;

    settled.forEach((result, index) => {
      if (result.status === 'fulfilled') results[uploads[index].id] = result.value;
    });

    const failure = settled.find(
      (result): result is PromiseRejectedResult => result.status === 'rejected',
    );

    if (failure) {
      throw failure.reason instanceof Error ? failure.reason : new Error('Upload failed');
    }

    return results;
  };

  return { toaster, withProgressToast, createUploadsToast, withUploadsToast, runUploadsInToast };
};
