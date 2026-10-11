import type { TThemeStoreHook } from '@beautinique/frontend-stores';
import { Icon } from '@iconify/react';
import type { ComponentProps } from 'react';

import { registerThemeIcons, THEME_ICONS } from './theme-icons.js';

export interface ITheme extends Omit<
  ComponentProps<'button'>,
  'children' | 'onClick' | 'type' | 'aria-label'
> {
  /** The theme store of the app: what `createThemeStore()` of `@beautinique/frontend-stores` gave it. */
  store: TThemeStoreHook;
  /** What the button says to assistive technology, for the theme it would switch to. */
  labels?: {
    /** @default 'Switch to light theme' */
    toLight?: string;
    /** @default 'Switch to dark theme' */
    toDark?: string;
  };
}

// The hit area is bigger than the icon (the icon is 20px on a phone): the `after` box is a part of the
// button, so a thumb that lands next to the icon still presses it, and nothing around it moves.
// No `outline-hidden`: in Tailwind v4 it sets `--tw-outline-style: none`, which the
// `focus-visible:outline-2` uses for its style, so the ring would never be drawn. A button only shows
// the browser's own ring for the keyboard anyway (`:focus-visible`), never for a click.
const BUTTON_CSS =
  "relative size-5 cursor-pointer rounded-full after:absolute after:-inset-1 after:content-[''] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-crayola-c md:size-6";
const ICON_CSS = 'text-tertiary hover:text-secondary size-full [&_path]:stroke-[1.5]';

/**
 * A button that switches between the dark and the light theme. It shows the theme it would switch
 * to: a sun while the theme is dark, a moon while it is light. It only changes the store; putting the
 * theme on the page (a class on `<html>`) is the app's.
 *
 * The icons move; for a person who asked their system for less motion (`prefers-reduced-motion`)
 * the button shows still ones instead.
 */
export const Theme = ({ store: useThemeStore, labels, className = '', ...buttonProps }: ITheme) => {
  registerThemeIcons();

  const theme = useThemeStore((state) => state.theme);
  const toggleTheme = useThemeStore((state) => state.toggleTheme);

  const isDark = theme === 'dark';
  const icons = THEME_ICONS[isDark ? 'dark' : 'light'];
  const { toLight = 'Switch to light theme', toDark = 'Switch to dark theme' } = labels ?? {};

  return (
    <button
      {...buttonProps}
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? toLight : toDark}
      className={`${BUTTON_CSS} ${className}`}
    >
      {/* Both are in the page and css picks one: no script has to ask the system about motion. */}
      <Icon icon={icons.moving} className={`${ICON_CSS} motion-reduce:hidden`} />
      <Icon icon={icons.still} className={`${ICON_CSS} hidden motion-reduce:block`} />
    </button>
  );
};
