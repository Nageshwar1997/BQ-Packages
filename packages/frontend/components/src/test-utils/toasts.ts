import { createToaster, createToastStore } from '@beautinique/frontend-stores';

import type { TToast } from '../toast/types.js';

/** A toast store of its own and the toaster made for it, the way an app makes them. */
export const makeToasts = () => {
  const store = createToastStore<TToast>();

  return { store, ...createToaster(store) };
};
