import { TOAST_TYPE } from '../lib/constants.js';
import { useToastStore } from './toast.store.js';
import type {
  ICustomToast,
  IDefaultToast,
  ILoadingToast,
  IProgressToast,
  IUploadItem,
  IUploadsToast,
  TProgressToastOptions,
} from './types.js';

const { add, update, remove } = useToastStore.getState();
export const toaster = {
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

export const withProgressToast = async <T>({
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
