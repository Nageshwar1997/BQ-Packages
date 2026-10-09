import type { ReactNode } from 'react';

import type { TOAST_TYPE } from '../lib/constants.js';
import type { IClassName, ITextButton, ITitleDescription } from '../types/component.js';

/** What the browser tells about the progress of an upload (an `AxiosProgressEvent` fits). */
export interface TUploadProgressEvent {
  loaded: number;
  total?: number;
}

export type TUploadProgressHandler = (event: TUploadProgressEvent) => void;

interface IBaseToast extends IClassName {
  icon?: ReactNode;
  buttonProps?: Partial<ITextButton>;
}

interface IToastClosable {
  isClosable?: boolean;
  autoClose?: boolean;
  closeTimer?: number;
}

export interface IDefaultToast extends IBaseToast, IToastClosable, ITitleDescription {
  type:
    | typeof TOAST_TYPE.success
    | typeof TOAST_TYPE.error
    | typeof TOAST_TYPE.warning
    | typeof TOAST_TYPE.default;
}

export interface ICustomToast extends IBaseToast, IToastClosable {
  type: typeof TOAST_TYPE.custom;
  children: ReactNode;
  title?: never;
  description?: never;
}

export interface ILoadingToast extends IBaseToast, ITitleDescription {
  type: typeof TOAST_TYPE.loading;
  isClosable?: never;
  autoClose?: never;
  closeTimer?: never;
}

export interface IProgressToast extends Omit<ILoadingToast, 'type'> {
  type: typeof TOAST_TYPE.progress;
  progress: number;
}

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

/**
 * One toast for one or more uploads running together: the overall progress on the left, how many
 * files are through underneath and, when there is more than one upload, a row for each of them.
 */
export interface IUploadsToast extends IBaseToast {
  type: typeof TOAST_TYPE.uploads;
  title: string;
  description?: string;
  items: IUploadItem[];
  isClosable?: never;
  autoClose?: never;
  closeTimer?: never;
}

export type TToast = IDefaultToast | ICustomToast | ILoadingToast | IProgressToast | IUploadsToast;

export type TToastItem = TToast & { id: string };

export interface IToastStore {
  toasts: TToastItem[];
  add: (toast: TToast) => string;
  update: {
    progress: (id: string, progress: number) => void;
    uploadItem: (id: string, itemId: string, patch: Partial<Omit<IUploadItem, 'id'>>) => void;
  };
  remove: (id: string) => void;
}

export type TProgressToastOptions<T> = ITitleDescription & {
  request: (onProgress: TUploadProgressHandler) => Promise<T>;
};

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
