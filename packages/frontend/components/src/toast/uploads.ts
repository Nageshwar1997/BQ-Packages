import type { IUploadItem } from './types.js';

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
