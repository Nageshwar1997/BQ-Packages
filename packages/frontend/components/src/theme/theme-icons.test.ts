// @vitest-environment jsdom
import { getIcon } from '@iconify/react';
import { describe, expect, it } from 'vitest';

import { registerThemeIcons, THEME_ICON_NAMES, THEME_ICONS } from './theme-icons.js';

describe('bundled theme icons', () => {
  it('has nothing registered until the button asks for it', () => {
    expect(getIcon('line-md:sunny-loop')).toBeFalsy();
  });

  it('lists the icons of the button', () => {
    expect([...THEME_ICON_NAMES].sort()).toEqual([
      'line-md:moon-loop',
      'line-md:sunny-loop',
      'solar:moon-linear',
      'solar:sun-2-linear',
    ]);
  });

  it('names, for each theme, the icon that moves and the one that is still', () => {
    expect(THEME_ICONS).toEqual({
      dark: { moving: 'line-md:sunny-loop', still: 'solar:sun-2-linear' },
      light: { moving: 'line-md:moon-loop', still: 'solar:moon-linear' },
    });
  });

  it('registers every icon that the button names', () => {
    const named = Object.values(THEME_ICONS).flatMap((icons) => [icons.moving, icons.still]);

    expect([...named].sort()).toEqual([...THEME_ICON_NAMES].sort());
  });

  it('has every icon it lists, with the drawing and the size, with no network', () => {
    registerThemeIcons();

    for (const name of THEME_ICON_NAMES) {
      const icon = getIcon(name);

      expect(icon, name).toBeTruthy();
      expect(icon?.body, name).toContain('currentColor'); // takes the colour of the text
      expect(icon?.width, name).toBe(24);
      expect(icon?.height, name).toBe(24);
    }
  });

  it('moves the ones that move, by themselves (SMIL), and keeps the other ones still', () => {
    registerThemeIcons();

    for (const { moving, still } of Object.values(THEME_ICONS)) {
      expect(getIcon(moving)?.body).toContain('<animate');
      expect(getIcon(still)?.body).not.toContain('<animate');
    }
  });

  it('can be called again and again', () => {
    registerThemeIcons();
    registerThemeIcons();

    expect(getIcon('solar:moon-linear')?.body).toContain('M12 22C17.5228');
  });
});
