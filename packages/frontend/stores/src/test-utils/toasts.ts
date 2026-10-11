import { createToastStore } from '../toast.store.js';
import { createToaster, type IUploadItem } from '../toaster.js';

/**
 * The toasts of an app, as an app would give them: a union with one `type` for each kind. (The apps
 * have richer ones, with icons and buttons; the store and the toaster only need the shapes below.)
 */
export type TTestToast =
  | {
      type: 'success' | 'error' | 'warning' | 'default';
      title: string;
      description?: string;
      closeTimer?: number;
    }
  | { type: 'custom'; children: string; title?: never; description?: never }
  | { type: 'loading'; title: string; description?: string }
  | { type: 'progress'; title: string; description?: string; progress: number }
  | { type: 'uploads'; title: string; description?: string; items: IUploadItem[] };

/** A toast store of its own and the toaster made for it, the way an app makes them. */
export const makeToasts = () => {
  const store = createToastStore<TTestToast>();

  return { store, ...createToaster(store) };
};
