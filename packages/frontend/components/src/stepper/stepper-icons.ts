import { addCollection, type IconifyJSON } from '@iconify/react';

/*
 * The tick of a completed step. Iconify downloads an icon from its API the first time it is shown,
 * which cannot work offline and leaves an empty circle until it arrives, so the icon is bundled here
 * and registered with Iconify (the same way as the toast icons, see `toast-icons.ts`).
 *
 * An icon a step asks for with `icon: 'solar:...'` is the app's and is downloaded as usual; add it to
 * the app with `addCollection` when it has to show without a network.
 *
 * The data is what `https://api.iconify.design/<prefix>.json?icons=<name>` answers.
 */
const STEPPER_ICON_SETS: IconifyJSON[] = [
  {
    prefix: 'solar',
    width: 24,
    height: 24,
    icons: {
      'check-read-linear': {
        body: '<g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"><path d="M4 12.9L7.14286 16.5L15 7.5"/><path d="M20 7.5625L11.4283 16.5625L11 16"/></g>',
      },
    },
  },
];

let registered = false;

/**
 * Registers the icons above with Iconify. `Stepper` calls it when it renders, not when this file is
 * imported: an app that never renders a stepper never runs it, and nothing depends on the bundler
 * keeping an import that is only there for its effect (see `toast-icons.ts`). Calling it again is
 * harmless.
 */
export const registerStepperIcons = () => {
  if (registered) return;

  for (const iconSet of STEPPER_ICON_SETS) addCollection(iconSet);
  registered = true;
};

/** Every icon name registered above, e.g. `solar:check-read-linear`. */
export const STEPPER_ICON_NAMES = STEPPER_ICON_SETS.flatMap(({ prefix, icons }) =>
  Object.keys(icons).map((name) => `${prefix}:${name}`),
);
