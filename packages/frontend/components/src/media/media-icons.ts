import type { IconifyJSON } from '@iconify/react';

import { createIconRegistry } from '../lib/icon-registry.js';

/*
 * The icons of the carousels and the media dialog, bundled so they show without a network and without waiting for the
 * Iconify API (see `toast/toast-icons.ts`). The data is what
 * `https://api.iconify.design/<prefix>.json?icons=<name>` answers.
 */
const ICON_SETS: IconifyJSON[] = [
  {
    prefix: 'solar',
    width: 24,
    height: 24,
    icons: {
      'play-linear': {
        body: '<path fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="1.5" d="M20.4086 9.35258C22.5305 10.5065 22.5305 13.4935 20.4086 14.6474L7.59662 21.6145C5.53435 22.736 3 21.2763 3 18.9671L3 5.0329C3 2.72368 5.53435 1.26402 7.59661 2.38548L20.4086 9.35258Z"/>',
      },
      'alt-arrow-left-linear': {
        body: '<path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15 5L9 12L15 19"/>',
      },
    },
  },
  {
    prefix: 'lucide',
    width: 24,
    height: 24,
    icons: {
      x: {
        body: '<path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 6L6 18M6 6l12 12"/>',
      },
    },
  },
];

/**
 * Registers the icons above with Iconify; the components of this entry call it when they render
 * (calling it again is harmless).
 */
export const { register: registerMediaIcons, names: MEDIA_ICON_NAMES } =
  createIconRegistry(ICON_SETS);
