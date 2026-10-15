import type { IconifyJSON } from '@iconify/react';

import { createIconRegistry } from '../lib/icon-registry.js';

/*
 * The icons of the steps of the wake-up progress, bundled so they show without a network and without waiting for the
 * Iconify API (see `toast/toast-icons.ts`). The data is what
 * `https://api.iconify.design/<prefix>.json?icons=<name>` answers.
 */
const ICON_SETS: IconifyJSON[] = [
  {
    prefix: 'solar',
    width: 24,
    height: 24,
    icons: {
      'clock-circle-linear': {
        body: '<g fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><path stroke-linejoin="round" d="M12 8V12L14.5 14.5"/></g>',
      },
      'refresh-linear': {
        body: '<g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"><path d="M3.67981 13L3.67981 11.3333C3.67981 6.73096 7.4402 3 12.0789 3C15.1178 3 17.7799 4.60136 19.2545 7M2 11.3333L3.67981 13L5.35962 11.3333"/><path d="M20.3139 11V12.6667C20.3139 17.269 16.5391 21 11.8827 21C8.83213 21 6.15995 19.3986 4.67969 17M22.0001 12.6667L20.3139 11L18.6277 12.6667"/></g>',
      },
      'check-circle-linear': {
        body: '<g fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><path stroke-linejoin="round" d="M8.5 12.5L10.5 14.5L15.5 9.5"/></g>',
      },
    },
  },
];

/**
 * Registers the icons above with Iconify; the components of this entry call it when they render
 * (calling it again is harmless).
 */
export const { register: registerLoadingScreenIcons, names: LOADING_SCREEN_ICON_NAMES } =
  createIconRegistry(ICON_SETS);
