// @vitest-environment jsdom
import { getIcon } from '@iconify/react';
import { describe, expect, it } from 'vitest';

import { createIconRegistry } from './icon-registry.js';
import { registerTryOnIcons, TRYON_ICON_NAMES } from './try-on-icons.js';

describe('the bundled icons of the try-on', () => {
  it('list some icons, each once', () => {
    expect(TRYON_ICON_NAMES.length).toBeGreaterThan(30);
    expect(new Set(TRYON_ICON_NAMES).size).toBe(TRYON_ICON_NAMES.length);
  });

  it('are all in Iconify once registered, with a drawing and a size, with no network', () => {
    registerTryOnIcons();

    for (const name of TRYON_ICON_NAMES) {
      const icon = getIcon(name);

      expect(icon, name).toBeTruthy();
      expect(icon?.body.length, name).toBeGreaterThan(10);
      expect(icon?.width, name).toBeGreaterThan(0);
      expect(icon?.height, name).toBeGreaterThan(0);
    }
  });

  it('take the colour of the text', () => {
    registerTryOnIcons();

    for (const name of TRYON_ICON_NAMES) {
      expect(getIcon(name)?.body, name).toContain('currentColor');
    }
  });

  it('can be registered again and again', () => {
    registerTryOnIcons();
    registerTryOnIcons();

    expect(getIcon(TRYON_ICON_NAMES[0] ?? '')).toBeTruthy();
  });
});

describe('createIconRegistry', () => {
  const sets = [
    {
      prefix: 'registry-test',
      width: 24,
      height: 24,
      icons: { dot: { body: '<circle cx="12" cy="12" r="2"/>' } },
      aliases: { point: { parent: 'dot' } },
    },
  ];

  it('lists the icons and the aliases of its sets', () => {
    expect(createIconRegistry(sets).names).toEqual(['registry-test:dot', 'registry-test:point']);
  });

  it('puts nothing in Iconify until `register` is called, and then everything', () => {
    const registry = createIconRegistry(sets);

    expect(getIcon('registry-test:dot')).toBeFalsy();

    registry.register();

    expect(getIcon('registry-test:dot')?.body).toContain('<circle');
    expect(getIcon('registry-test:point')?.body).toContain('<circle');
  });
});
