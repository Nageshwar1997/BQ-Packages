import { addCollection, type IconifyJSON } from '@iconify/react';

/**
 * Makes the registration of a bundled icon set: `register` puts the sets in Iconify (once, calling it
 * again does nothing) and `names` lists every icon, e.g. `solar:info-circle-linear`.
 *
 * A component calls `register` when it renders, not when its file is imported: an app that never
 * renders the component never runs it, and nothing depends on the bundler keeping an import that is
 * only there for its effect (the build says "ignored-bare-import" for those).
 */
export const createIconRegistry = (sets: readonly IconifyJSON[]) => {
  let registered = false;

  return {
    register: () => {
      if (registered) return;

      for (const set of sets) addCollection(set);
      registered = true;
    },
    names: sets.flatMap(({ prefix, icons, aliases }) =>
      [...Object.keys(icons), ...Object.keys(aliases ?? {})].map((name) => `${prefix}:${name}`),
    ),
  };
};
