import type { IconifyJSON } from '@iconify/react';

import { createIconRegistry } from '../lib/icon-registry.js';

/*
 * The icons of the parts of a static page, bundled so they show without a network and without waiting for the
 * Iconify API (see `toast/toast-icons.ts`). The data is what
 * `https://api.iconify.design/<prefix>.json?icons=<name>` answers.
 */
const ICON_SETS: IconifyJSON[] = [
  {
    prefix: 'solar',
    width: 24,
    height: 24,
    icons: {
      'calendar-mark-linear': {
        body: '<g fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="1.5"><path d="M2 12C2 8.22876 2 6.34315 3.17157 5.17157C4.34315 4 6.22876 4 10 4H14C17.7712 4 19.6569 4 20.8284 5.17157C22 6.34315 22 8.22876 22 12V14C22 17.7712 22 19.6569 20.8284 20.8284C19.6569 22 17.7712 22 14 22H10C6.22876 22 4.34315 22 3.17157 20.8284C2 19.6569 2 17.7712 2 14V12Z"/><path d="M7 4V2.5"/><path d="M17 4V2.5"/><circle cx="16.5" cy="16.5" r="1.5"/><path d="M2.5 9H21.5"/></g>',
      },
      'check-circle-linear': {
        body: '<g fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><path stroke-linejoin="round" d="M8.5 12.5L10.5 14.5L15.5 9.5"/></g>',
      },
      'danger-triangle-linear': {
        body: '<g fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="1.5"><path d="M5.31171 10.7615C8.23007 5.58716 9.68925 3 12 3C14.3107 3 15.7699 5.58716 18.6883 10.7615L19.0519 11.4063C21.4771 15.7061 22.6897 17.856 21.5937 19.428C20.4978 21 17.7864 21 12.3637 21H11.6363C6.21356 21 3.50217 21 2.40626 19.428C1.31034 17.856 2.52291 15.7061 4.94805 11.4063L5.31171 10.7615Z"/><path d="M12 8V13"/><path stroke-linejoin="round" d="M12 16H12.0001"/></g>',
      },
      'letter-linear': {
        body: '<g fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="1.5"><path d="M2 12C2 8.22876 2 6.34315 3.17157 5.17157C4.34315 4 6.22876 4 10 4H14C17.7712 4 19.6569 4 20.8284 5.17157C22 6.34315 22 8.22876 22 12C22 15.7712 22 17.6569 20.8284 18.8284C19.6569 20 17.7712 20 14 20H10C6.22876 20 4.34315 20 3.17157 18.8284C2 17.6569 2 15.7712 2 12Z"/><path d="M6 8L8.1589 9.79908C9.99553 11.3296 10.9139 12.0949 12 12.0949C13.0861 12.0949 14.0045 11.3296 15.8411 9.79908L18 8"/></g>',
      },
    },
  },
];

/**
 * Registers the icons above with Iconify; the components of this entry call it when they render
 * (calling it again is harmless).
 */
export const { register: registerStaticPageIcons, names: STATIC_PAGE_ICON_NAMES } =
  createIconRegistry(ICON_SETS);
