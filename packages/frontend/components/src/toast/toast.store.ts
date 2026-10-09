import { nanoid } from 'nanoid';
import { create } from 'zustand';

import { TOAST_TYPE } from '../lib/constants.js';
import type { IToastStore } from './types.js';

const useToastStore = create<IToastStore>((set) => ({
  toasts: [],

  add: (toast) => {
    const id = nanoid();

    set((state) => ({ toasts: [...state.toasts, { ...toast, id }] }));

    return id; // return the id of the toast for removal
  },

  update: {
    progress: (id, progress) => {
      set((state) => ({
        toasts: state.toasts.map((toast) => (toast.id === id ? { ...toast, progress } : toast)),
      }));
    },

    uploadItem: (id, itemId, patch) => {
      set((state) => ({
        toasts: state.toasts.map((toast) =>
          toast.id === id && toast.type === TOAST_TYPE.uploads
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
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
  },
}));

export { useToastStore };
