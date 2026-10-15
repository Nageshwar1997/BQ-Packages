import { useEffect } from 'react';

// How many things (dialogs) hold the page still right now, and what the page had before the first did.
let holders = 0;
let saved: { overflow: string; paddingRight: string } | null = null;

const lock = () => {
  holders += 1;

  if (holders > 1) return;

  const { body, documentElement } = document;
  // the scrollbar goes away with `overflow: hidden`: its width is given back as padding, so the
  // page does not jump to the side
  const scrollbar = window.innerWidth - documentElement.clientWidth;

  saved = { overflow: body.style.overflow, paddingRight: body.style.paddingRight };
  body.style.overflow = 'hidden';

  if (scrollbar > 0) {
    body.style.paddingRight = `${String(parseFloat(getComputedStyle(body).paddingRight) + scrollbar)}px`;
  }
};

const unlock = () => {
  holders = Math.max(0, holders - 1);

  if (holders > 0 || !saved) return;

  document.body.style.overflow = saved.overflow;
  document.body.style.paddingRight = saved.paddingRight;
  saved = null;
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
