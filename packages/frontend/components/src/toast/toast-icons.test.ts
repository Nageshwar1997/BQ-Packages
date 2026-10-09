// @vitest-environment jsdom
import { getIcon } from '@iconify/react';
import { describe, expect, it } from 'vitest';

import { TOAST_ICON_NAMES } from './toast-icons.js';

describe('bundled toast icons', () => {
  it('lists the icons the toasts use', () => {
    expect([...TOAST_ICON_NAMES].sort()).toEqual([
      'beautinique:loading-spin',
      'lucide:x',
      'solar:check-circle-linear',
      'solar:clock-circle-linear',
      'solar:danger-triangle-linear',
      'solar:info-circle-outline',
    ]);
  });

  // A css turn (`animate-spin`) rotates a picture of the whole svg, and on a screen with a scaling of
  // 125% an icon of 20px is 25 device pixels: its middle is half a pixel off and the ring jumps a
  // little while it turns. Turning inside the svg draws the ring again at every angle instead.
  it('turns the loading spinner by itself, inside the svg, around the middle of the ring', () => {
    const body = getIcon('beautinique:loading-spin')?.body ?? '';

    expect(body).toContain('<animateTransform');
    expect(body).toContain('attributeName="transform"');
    expect(body).toContain('type="rotate"');
    expect(body).toContain('from="0 12 12"'); // the ring is drawn around (12, 12) of its 24 x 24
    expect(body).toContain('to="360 12 12"');
    expect(body).toContain('repeatCount="indefinite"');
  });

  it('has the drawing and the size of every icon it lists, with no network', () => {
    for (const name of TOAST_ICON_NAMES) {
      const icon = getIcon(name);

      expect(icon, name).not.toBeNull();
      expect(icon?.body, name).toContain('currentColor'); // takes the toast's colour
      expect(icon?.width, name).toBeGreaterThan(0);
      expect(icon?.height, name).toBeGreaterThan(0);
    }
  });
});
