import { addCollection, type IconifyJSON } from '@iconify/react';

/*
 * The icons of the theme button. Iconify downloads an icon from its API the first time it is shown,
 * which cannot work offline and leaves the button empty until it arrives, so they are bundled here and
 * registered with Iconify (the same way as the toast icons, see `toast-icons.ts`).
 *
 * For each theme there are two: one that moves (`line-md`, drawn with SMIL and never stops) and a
 * still one (`solar`) for a person who asked for less motion.
 *
 * The data is what `https://api.iconify.design/<prefix>.json?icons=<name>` answers.
 */
const THEME_ICON_SETS: IconifyJSON[] = [
  {
    prefix: 'line-md',
    width: 24,
    height: 24,
    icons: {
      'sunny-loop': {
        body: '<g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"><path stroke-dasharray="34" d="M12 7c2.76 0 5 2.24 5 5c0 2.76 -2.24 5 -5 5c-2.76 0 -5 -2.24 -5 -5c0 -2.76 2.24 -5 5 -5Z"><animate fill="freeze" attributeName="stroke-dashoffset" dur="0.4s" values="34;0"/></path><path d="M12 21v1M21 12h1M12 3v-1M3 12h-1" opacity="0"><animateTransform attributeName="transform" dur="30s" repeatCount="indefinite" type="rotate" values="0 12 12;360 12 12"/><set fill="freeze" attributeName="opacity" begin="0.5s" to="1"/><animate fill="freeze" attributeName="d" begin="0.5s" dur="0.2s" values="M12 19v1M19 12h1M12 5v-1M5 12h-1;M12 21v1M21 12h1M12 3v-1M3 12h-1"/></path><path d="M18.5 18.5l0.5 0.5M18.5 5.5l0.5 -0.5M5.5 5.5l-0.5 -0.5M5.5 18.5l-0.5 0.5" opacity="0"><animateTransform attributeName="transform" dur="30s" repeatCount="indefinite" type="rotate" values="0 12 12;360 12 12"/><set fill="freeze" attributeName="opacity" begin="0.7s" to="1"/><animate fill="freeze" attributeName="d" begin="0.7s" dur="0.2s" values="M17 17l0.5 0.5M17 7l0.5 -0.5M7 7l-0.5 -0.5M7 17l-0.5 0.5;M18.5 18.5l0.5 0.5M18.5 5.5l0.5 -0.5M5.5 5.5l-0.5 -0.5M5.5 18.5l-0.5 0.5"/></path></g>',
      },
      'moon-loop': {
        body: '<path fill="none" stroke="currentColor" stroke-dasharray="56" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 6c0 6.08 4.92 11 11 11c0.53 0 1.05 -0.04 1.56 -0.11c-1.61 2.47 -4.39 4.11 -7.56 4.11c-4.97 0 -9 -4.03 -9 -9c0 -3.17 1.64 -5.95 4.11 -7.56c-0.07 0.51 -0.11 1.03 -0.11 1.56Z"><animate fill="freeze" attributeName="stroke-dashoffset" dur="0.6s" values="56;0"/></path><g fill="currentColor"><path d="M15.22 6.03l2.53 -1.94l-3.19 -0.09l-1.06 -3l-1.06 3l-3.19 0.09l2.53 1.94l-0.91 3.06l2.63 -1.81l2.63 1.81l-0.91 -3.06Z" opacity="0"><animate attributeName="opacity" begin="0.7s" dur="6s" keyTimes="0;0.1;0.4;0.5;1" repeatCount="indefinite" values="0;1;1;0;0"/></path><path d="M19.61 12.25l1.64 -1.25l-2.06 -0.05l-0.69 -1.95l-0.69 1.95l-2.06 0.05l1.64 1.25l-0.59 1.98l1.7 -1.17l1.7 1.17l-0.59 -1.98Z" opacity="0"><animate attributeName="opacity" begin="0.7s" dur="6s" keyTimes="0;0.2;0.3;0.6;0.7;1" repeatCount="indefinite" values="0;0;1;1;0;0"/></path><path d="M13.61 5.25l1.64 -1.25l-2.06 -0.05l-0.69 -1.95l-0.69 1.95l-2.06 0.05l1.64 1.25l-0.59 1.98l1.7 -1.17l1.7 1.17Z" opacity="0"><animate attributeName="opacity" begin="3.7s" dur="6s" keyTimes="0;0.1;0.4;0.5;1" repeatCount="indefinite" values="0;1;1;0;0"/></path><path d="M20.83 9.73l1.88 -1.44l-2.37 -0.07l-0.79 -2.22l-0.79 2.23l-2.37 0.07l1.88 1.44l-0.68 2.27l1.95 -1.34l1.95 1.34Z" opacity="0"><animate attributeName="opacity" begin="3.7s" dur="6s" keyTimes="0;0.2;0.3;0.6;0.7;1" repeatCount="indefinite" values="0;0;1;1;0;0"/></path></g>',
      },
    },
  },
  {
    prefix: 'solar',
    width: 24,
    height: 24,
    icons: {
      'sun-2-linear': {
        body: '<g fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="1.5"><circle cx="12" cy="12" r="5"/><path d="M12 2V4"/><path d="M12 20V22"/><path d="M4 12L2 12"/><path d="M22 12L20 12"/><path d="M19.7778 4.22266L17.5558 6.25424"/><path d="M4.22217 4.22266L6.44418 6.25424"/><path d="M6.44434 17.5557L4.22211 19.7779"/><path d="M19.7778 19.7773L17.5558 17.5551"/></g>',
      },
      'moon-linear': {
        body: '<path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 22C17.5228 22 22 17.5228 22 12C22 11.5373 21.3065 11.4608 21.0672 11.8568C19.9289 13.7406 17.8615 15 15.5 15C11.9101 15 9 12.0899 9 8.5C9 6.13845 10.2594 4.07105 12.1432 2.93276C12.5392 2.69347 12.4627 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z"/>',
      },
    },
  },
];

/** What the button shows while the theme is dark (a sun: it would switch to light) and light (a moon). */
export const THEME_ICONS = {
  dark: { moving: 'line-md:sunny-loop', still: 'solar:sun-2-linear' },
  light: { moving: 'line-md:moon-loop', still: 'solar:moon-linear' },
} as const;

let registered = false;

/**
 * Registers the icons above with Iconify. `Theme` calls it when it renders, not when this file is
 * imported: an app that never renders the button never runs it, and nothing depends on the bundler
 * keeping an import that is only there for its effect (see `toast-icons.ts`). Calling it again is
 * harmless.
 */
export const registerThemeIcons = () => {
  if (registered) return;

  for (const iconSet of THEME_ICON_SETS) addCollection(iconSet);
  registered = true;
};

/** Every icon name registered above, e.g. `line-md:sunny-loop`. */
export const THEME_ICON_NAMES = THEME_ICON_SETS.flatMap(({ prefix, icons }) =>
  Object.keys(icons).map((name) => `${prefix}:${name}`),
);
