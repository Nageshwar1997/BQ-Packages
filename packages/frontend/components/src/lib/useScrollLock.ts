import { useEffect } from 'react';

import { sharedState } from './shared-state.js';

// How many things (dialogs) hold the page still right now, and what the page had before the first did.
// One for the whole page (see `sharedState`): the dialogs may be in different entries of the package.
const state = sharedState('scroll-lock', () => ({
  holders: 0,
  saved: null as { overflow: string; paddingRight: string } | null,
}));

const lock = () => {
  state.holders += 1;

  if (state.holders > 1) return;

  const { body, documentElement } = document;
  // the scrollbar goes away with `overflow: hidden`: its width is given back as padding, so the
  // page does not jump to the side
  const scrollbar = window.innerWidth - documentElement.clientWidth;

  state.saved = { overflow: body.style.overflow, paddingRight: body.style.paddingRight };
  body.style.overflow = 'hidden';

  if (scrollbar > 0) {
    body.style.paddingRight = `${String(parseFloat(getComputedStyle(body).paddingRight) + scrollbar)}px`;
  }
};

const unlock = () => {
  state.holders = Math.max(0, state.holders - 1);

  if (state.holders > 0 || !state.saved) return;

  document.body.style.overflow = state.saved.overflow;
  document.body.style.paddingRight = state.saved.paddingRight;
  state.saved = null;
};

/**
 * Keeps the page behind a dialog from scrolling while it is open. Several dialogs can be open
 * together: the page is released when the last one closes, and gets back exactly what it had (not
 * what the first dialog saw after another had already changed it).
 */
export const useScrollLock = (enabled: boolean) => {
  useEffect(() => {
    if (!enabled) return;

    lock();

    return unlock;
  }, [enabled]);
};
