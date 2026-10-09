import { addCollection, type IconifyJSON } from '@iconify/react';

/*
 * Iconify downloads an icon's SVG from its API the first time the icon is shown, and keeps it in
 * memory. A toast's icon is very often needed for the first time exactly when the download cannot
 * work: the "You're offline" toast, or the error toast of a request that failed because there is no
 * internet. Those icons are bundled here, so every toast has its icon without a network.
 *
 * Add an icon here when a toast starts using one (see `cardConfig` in `components/ui/Toaster.tsx`).
 * The data is what `https://api.iconify.design/<prefix>.json?icons=<name>` answers.
 */
const TOAST_ICON_SETS: IconifyJSON[] = [
  {
    prefix: 'solar',
    width: 24,
    height: 24,
    icons: {
      // warning and error toasts
      'danger-triangle-linear': {
        body: '<g fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="1.5"><path d="M5.31171 10.7615C8.23007 5.58716 9.68925 3 12 3C14.3107 3 15.7699 5.58716 18.6883 10.7615L19.0519 11.4063C21.4771 15.7061 22.6897 17.856 21.5937 19.428C20.4978 21 17.7864 21 12.3637 21H11.6363C6.21356 21 3.50217 21 2.40626 19.428C1.31034 17.856 2.52291 15.7061 4.94805 11.4063L5.31171 10.7615Z"/><path d="M12 8V13"/><path stroke-linejoin="round" d="M12 16H12.0001"/></g>',
      },
      // success toast
      'check-circle-linear': {
        body: '<g fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><path stroke-linejoin="round" d="M8.5 12.5L10.5 14.5L15.5 9.5"/></g>',
      },
      // an upload that is waiting its turn, in an uploads toast
      'clock-circle-linear': {
        body: '<g fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><path stroke-linejoin="round" d="M12 8V12L14.5 14.5"/></g>',
      },
      // default and custom toasts
      'info-circle-outline': {
        body: '<g fill="currentColor"><path d="M12 17.75C12.4142 17.75 12.75 17.4142 12.75 17V11C12.75 10.5858 12.4142 10.25 12 10.25C11.5858 10.25 11.25 10.5858 11.25 11V17C11.25 17.4142 11.5858 17.75 12 17.75Z"/><path d="M12 7C12.5523 7 13 7.44772 13 8C13 8.55228 12.5523 9 12 9C11.4477 9 11 8.55228 11 8C11 7.44772 11.4477 7 12 7Z"/><path fill-rule="evenodd" d="M1.25 12C1.25 6.06294 6.06294 1.25 12 1.25C17.9371 1.25 22.75 6.06294 22.75 12C22.75 17.9371 17.9371 22.75 12 22.75C6.06294 22.75 1.25 17.9371 1.25 12ZM12 2.75C6.89137 2.75 2.75 6.89137 2.75 12C2.75 17.1086 6.89137 21.25 12 21.25C17.1086 21.25 21.25 17.1086 21.25 12C21.25 6.89137 17.9371 2.75 12 2.75Z" clip-rule="evenodd"/></g>',
      },
    },
  },
  {
    prefix: 'beautinique',
    width: 24,
    height: 24,
    icons: {
      /*
       * The spinner of the loading toast and of an upload that is going on. It turns itself, inside
       * the svg (`animateTransform`, around the centre of the ring), instead of being turned by a
       * css `animate-spin` on the svg: the browser then draws the ring again at the exact angle on
       * every frame. A css turn rotates a picture of the whole svg, and on a screen with a scaling of
       * 125% an icon of 20px is 25 device pixels, so the middle of that picture is half a pixel off
       * and the ring jumps up and down a little while it turns. Do not add `animate-spin` to it.
       */
      'loading-spin': {
        body: '<path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M17 3.34A10 10 0 1 0 22 12"><animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="1s" repeatCount="indefinite"/></path>',
      },
    },
  },
  {
    prefix: 'lucide',
    width: 24,
    height: 24,
    icons: {
      // the close button of a closable toast
      x: {
        body: '<path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 6L6 18M6 6l12 12"/>',
      },
    },
  },
];

for (const iconSet of TOAST_ICON_SETS) addCollection(iconSet);

/** Every icon name registered above, e.g. `solar:danger-triangle-linear`. */
export const TOAST_ICON_NAMES = TOAST_ICON_SETS.flatMap(({ prefix, icons }) =>
  Object.keys(icons).map((name) => `${prefix}:${name}`),
);
