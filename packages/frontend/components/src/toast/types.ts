import type {
  IToastStore as IToastStoreOf,
  IUploadItem,
  TToastStoreHook,
} from '@beautinique/frontend-stores';
import type { ReactNode } from 'react';

import type { TOAST_TYPE } from '../lib/constants.js';
import type { IClassName, ITextButton, ITitleDescription } from '../types/component.js';

// The rows of an uploads toast are made by the toaster of `@beautinique/frontend-stores`, which
// owns their shape; the toast here only draws them.
export type { IUploadItem, TUploadItemStatus } from '@beautinique/frontend-stores';

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

/** The toast store: what `@beautinique/frontend-stores` makes, with the toasts of this package. */
export type IToastStore = IToastStoreOf<TToast>;

/** What `createToastStore<TToast>()` gives: the store the app makes and gives to the container (and to `createToaster`, of the stores package). */
export type TToastStore = TToastStoreHook<TToast>;

export interface IToastContainer {
  /** The toast store of the app, the one that its `createToaster` was given. */
  store: TToastStore;
}
