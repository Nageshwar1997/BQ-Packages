import { createToastStore } from '@beautinique/frontend-stores';

import { createToaster } from '../toast/toaster.js';
import type { TToast } from '../toast/types.js';

/** A toast store of its own and everything that is made for it, the way an app makes them. */
export const makeToasts = () => {
  const store = createToastStore<TToast>();

  return { store, ...createToaster(store) };
};
