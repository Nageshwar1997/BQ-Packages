import type { IconifyJSON } from '@iconify/react';

import { createIconRegistry } from '../lib/icon-registry.js';

/*
 * The icons of the testimonial carousel, bundled so they show without a network and without waiting for the
 * Iconify API (see `toast/toast-icons.ts`). The data is what
 * `https://api.iconify.design/<prefix>.json?icons=<name>` answers.
 */
const ICON_SETS: IconifyJSON[] = [
  {
    prefix: 'streamline-ultimate-color',
    width: 24,
    height: 24,
    icons: {
      'rating-star': {
        body: '<g fill="none"><path fill="#ffef5e" d="M11.523 1.332a.511.511 0 0 1 .957 0l2.59 7.343h7.315a.512.512 0 0 1 .332.9l-6.112 5.067l2.558 7.685a.512.512 0 0 1-.788.574L12 18.224L5.622 22.9a.511.511 0 0 1-.785-.574l2.559-7.685l-6.113-5.067a.512.512 0 0 1 .332-.9h7.316z"/><path fill="#fff9bf" d="M12 18.224L5.622 22.9a.511.511 0 0 1-.785-.574l2.559-7.685l-6.113-5.067a.512.512 0 0 1 .332-.9h7.316l2.59-7.343a.51.51 0 0 1 .48-.332z"/><path stroke="#191919" stroke-linecap="round" stroke-linejoin="round" d="M11.523 1.332a.511.511 0 0 1 .957 0l2.59 7.343h7.315a.512.512 0 0 1 .332.9l-6.112 5.067l2.558 7.685a.512.512 0 0 1-.788.574L12 18.224L5.622 22.9a.511.511 0 0 1-.785-.574l2.559-7.685l-6.113-5.067a.512.512 0 0 1 .332-.9h7.316z"/></g>',
      },
    },
  },
  {
    prefix: 'solar',
    width: 24,
    height: 24,
    icons: {
      'arrow-left-linear': {
        body: '<path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M20 12H4M10 18L4 12L10 6"/>',
      },
      'arrow-right-linear': {
        body: '<path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 12H20M14 18L20 12L14 6"/>',
      },
      'pause-linear': {
        body: '<g fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="1.5"><path d="M2 6C2 4.11438 2 3.17157 2.58579 2.58579C3.17157 2 4.11438 2 6 2C7.88562 2 8.82843 2 9.41421 2.58579C10 3.17157 10 4.11438 10 6V18C10 19.8856 10 20.8284 9.41421 21.4142C8.82843 22 7.88562 22 6 22C4.11438 22 3.17157 22 2.58579 21.4142C2 20.8284 2 19.8856 2 18V6Z"/><path d="M14 6C14 4.11438 14 3.17157 14.5858 2.58579C15.1716 2 16.1144 2 18 2C19.8856 2 20.8284 2 21.4142 2.58579C22 3.17157 22 4.11438 22 6V18C22 19.8856 22 20.8284 21.4142 21.4142C20.8284 22 19.8856 22 18 22C16.1144 22 15.1716 22 14.5858 21.4142C14 20.8284 14 19.8856 14 18V6Z"/></g>',
      },
      'play-linear': {
        body: '<path fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="1.5" d="M20.4086 9.35258C22.5305 10.5065 22.5305 13.4935 20.4086 14.6474L7.59662 21.6145C5.53435 22.736 3 21.2763 3 18.9671L3 5.0329C3 2.72368 5.53435 1.26402 7.59661 2.38548L20.4086 9.35258Z"/>',
      },
    },
  },
];

/**
 * Registers the icons above with Iconify; the components of this entry call it when they render
 * (calling it again is harmless).
 */
export const { register: registerTestimonialIcons, names: TESTIMONIAL_ICON_NAMES } =
  createIconRegistry(ICON_SETS);
