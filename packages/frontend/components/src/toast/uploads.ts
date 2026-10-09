import { toaster } from './toaster.js';
import type {
  IUploadGroup,
  IUploadItem,
  IUploadItemHandle,
  TUploadItemStatus,
  TUploadProgressHandler,
} from './types.js';

const sum = (numbers: number[]) => numbers.reduce((total, value) => total + value, 0);

/* ===================== WHAT THE TOAST SHOWS ===================== */

export const isUploadItemSettled = ({ status }: Pick<IUploadItem, 'status'>) =>
  status === 'success' || status === 'error';

/**
 * How many files of an upload are through. An upload is one request, so a file is known to be
 * through only once the server has answered; until then the files that were completely sent count,
 * except the last one (it may still be on its way to the storage). A failed upload has none.
 */
export const getUploadItemFilesDone = ({
  status,
  loaded,
  fileSizes,
}: Pick<IUploadItem, 'status' | 'loaded' | 'fileSizes'>) => {
  if (status === 'success') return fileSizes.length;
  if (status !== 'uploading') return 0;

  let sent = 0;
  let bytes = 0;

  for (const size of fileSizes) {
    bytes += size;

    if (bytes > loaded) break;

    sent += 1;
  }

  return Math.min(sent, Math.max(fileSizes.length - 1, 0));
};

/** How far one upload is, 0 to 100. 100 is only for an upload the server has answered. */
export const getUploadItemPercent = ({
  status,
  loaded,
  total,
}: Pick<IUploadItem, 'status' | 'loaded' | 'total'>) => {
  if (status === 'success') return 100;
  if (status === 'pending' || total <= 0) return 0;

  return Math.min(99, Math.round((Math.min(loaded, total) * 100) / total));
};

export interface IUploadsSummary {
  /** Overall progress by bytes, 0 to 100. 100 only when every upload has succeeded. */
  percent: number;
  filesDone: number;
  filesTotal: number;
  /** How many uploads failed. */
  failed: number;
  /** Every upload has either succeeded or failed. */
  isSettled: boolean;
}

export const getUploadsSummary = (items: IUploadItem[]): IUploadsSummary => {
  const failed = items.filter(({ status }) => status === 'error').length;
  const isSettled = items.every(isUploadItemSettled);
  const bytesTotal = sum(items.map(({ total }) => total));
  const bytesDone = sum(
    items.map((item) =>
      item.status === 'success' ? item.total : Math.min(item.loaded, item.total),
    ),
  );

  let percent = bytesTotal > 0 ? Math.round((bytesDone * 100) / bytesTotal) : 0;

  if (isSettled && failed === 0) percent = 100;
  else percent = Math.min(percent, 99);

  return {
    percent,
    filesDone: sum(items.map(getUploadItemFilesDone)),
    filesTotal: sum(items.map(({ fileSizes }) => fileSizes.length)),
    failed,
    isSettled,
  };
};

/* ===================== FILES ===================== */

/** The files of a FormData, in the order they are sent. */
export const getFormDataFiles = (data: FormData, key = 'files'): File[] =>
  data.getAll(key).filter((value): value is File => value instanceof File);

/* ===================== THE TOAST OF A GROUP OF UPLOADS ===================== */

interface IUploadGroupOptions {
  title: string;
  description?: string;
  items: { id: string; label: string; files: File[] }[];
}

/**
 * Opens one toast for the uploads of `items`. It closes by itself a moment after every upload is
 * over. Returns nothing when there is nothing to upload, so no empty toast is shown.
 */
export const createUploadsToast = ({
  title,
  description,
  items,
}: IUploadGroupOptions): IUploadGroup | undefined => {
  if (items.length === 0) return undefined;

  const statuses = new Map<string, TUploadItemStatus>(items.map(({ id }) => [id, 'pending']));

  const toastId = toaster.uploads.start({
    title,
    description,
    items: items.map(({ id, label, files }) => {
      const fileSizes = files.map(({ size }) => size);

      return { id, label, status: 'pending', loaded: 0, total: sum(fileSizes), fileSizes };
    }),
  });

  const patch = (id: string, changes: Partial<Omit<IUploadItem, 'id'>>) => {
    if (changes.status) statuses.set(id, changes.status);

    toaster.uploads.update(toastId, id, changes);
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

/** The toast for a single request that uploads several files at once. */
export const withUploadsToast = async <T>({
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

/**
 * Runs the uploads of several fields (e.g. the images of each editor of a form step) behind one
 * toast with a row for every field that has files. `run` is called for every field, with the row of
 * that field to give to its upload (nothing when the toast has no row for it). Every upload is
 * waited for, so none is shown as failed just because another one failed; if any failed, the first
 * error is thrown once all are over.
 */
export const runUploadsInToast = async <TId extends string, TResult>({
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
