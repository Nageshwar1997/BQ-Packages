import { TOAST_TYPE } from '../lib/constants.js';
import type {
  ICustomToast,
  IDefaultToast,
  ILoadingToast,
  IProgressToast,
  IUploadItem,
  IUploadsToast,
  TProgressToastOptions,
  TToastStore,
} from './types.js';
import { createUploadsHelpers } from './uploads.js';

const createToasterApi = (store: TToastStore) => {
  const { add, update, remove } = store.getState();

  return {
    success: (data: Omit<IDefaultToast, 'type'>) => add({ ...data, type: TOAST_TYPE.success }),
    error: (data: Omit<IDefaultToast, 'type'>) => add({ ...data, type: TOAST_TYPE.error }),
    warning: (data: Omit<IDefaultToast, 'type'>) => add({ ...data, type: TOAST_TYPE.warning }),
    default: (data: Omit<IDefaultToast, 'type'>) => add({ ...data, type: TOAST_TYPE.default }),
    loading: (data: Omit<ILoadingToast, 'type'>) => add({ ...data, type: TOAST_TYPE.loading }),
    custom: (data: ICustomToast) => add(data),
    progress: {
      start: (data: Omit<IProgressToast, 'type'>) => add({ ...data, type: TOAST_TYPE.progress }),
      update: (toastId: string, progress: number) => {
        update.progress(toastId, progress);
      },
      end: (toastId: string) => {
        remove(toastId);
      },
    },
    uploads: {
      start: (data: Omit<IUploadsToast, 'type'>) => add({ ...data, type: TOAST_TYPE.uploads }),
      update: (toastId: string, itemId: string, patch: Partial<Omit<IUploadItem, 'id'>>) => {
        update.uploadItem(toastId, itemId, patch);
      },
    },
    remove: (toastId: string) => {
      remove(toastId);
    },
  };
};

/** Shows toasts in a store: `toaster.success({ title })`, `toaster.remove(id)`, ... */
export type IToaster = ReturnType<typeof createToasterApi>;

/**
 * Everything that shows toasts, made for one store: the `toaster`, and the helpers for toasts that
 * follow a request (`withProgressToast`) or several uploads (`withUploadsToast`,
 * `runUploadsInToast`, `createUploadsToast`).
 *
 * The app makes the store once (`createToastStore<TToast>()` of `@beautinique/frontend-stores`),
 * gives it to this function and to the `ToastContainer` that draws the toasts, and exports what
 * comes out for the rest of the app to import:
 *
 * ```ts
 * export const useToastStore = createToastStore<TToast>();
 * export const { toaster, withProgressToast, withUploadsToast, runUploadsInToast } =
 *   createToaster(useToastStore);
 * // <ToastContainer store={useToastStore} />
 * ```
 *
 * It works from anywhere (an API client, a store), not only from components.
 */
export const createToaster = (store: TToastStore) => {
  const toaster = createToasterApi(store);

  const withProgressToast = async <T>({
    title,
    description,
    request,
  }: TProgressToastOptions<T>): Promise<T> => {
    const toastId = toaster.progress.start({ title, description, progress: 0 });

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

  return { toaster, withProgressToast, ...createUploadsHelpers(toaster) };
};

export type TToasterKit = ReturnType<typeof createToaster>;
