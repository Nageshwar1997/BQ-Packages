// @vitest-environment jsdom
import { getIcon } from '@iconify/react';
import { describe, expect, it } from 'vitest';

import { BREADCRUMB_ICON_NAMES, registerBreadcrumbIcons } from '../breadcrumb/breadcrumb-icons.js';
import {
  COLOR_INPUT_ICON_NAMES,
  registerColorInputIcons,
} from '../color-input/color-input-icons.js';
import { FILE_INPUT_ICON_NAMES, registerFileInputIcons } from '../file-input/file-input-icons.js';
import {
  HIERARCHY_SELECT_ICON_NAMES,
  registerHierarchySelectIcons,
} from '../hierarchy-select/hierarchy-select-icons.js';
import { INPUT_ICON_NAMES, registerInputIcons } from '../inputs/inputs-icons.js';
import { LAYOUT_ICON_NAMES, registerLayoutIcons } from '../layout/layout-icons.js';
import {
  LOADING_SCREEN_ICON_NAMES,
  registerLoadingScreenIcons,
} from '../loading-screen/loading-screen-icons.js';
import { MEDIA_ICON_NAMES, registerMediaIcons } from '../media/media-icons.js';
import {
  registerStaticPageIcons,
  STATIC_PAGE_ICON_NAMES,
} from '../static-page/static-page-icons.js';
import {
  registerTestimonialIcons,
  TESTIMONIAL_ICON_NAMES,
} from '../testimonials/testimonials-icons.js';
import { createIconRegistry } from './icon-registry.js';

const GROUPS: [string, () => void, string[]][] = [
  ['inputs', registerInputIcons, INPUT_ICON_NAMES],
  ['layout', registerLayoutIcons, LAYOUT_ICON_NAMES],
  ['loading screen', registerLoadingScreenIcons, LOADING_SCREEN_ICON_NAMES],
  ['media', registerMediaIcons, MEDIA_ICON_NAMES],
  ['testimonials', registerTestimonialIcons, TESTIMONIAL_ICON_NAMES],
  ['hierarchy select', registerHierarchySelectIcons, HIERARCHY_SELECT_ICON_NAMES],
  ['color input', registerColorInputIcons, COLOR_INPUT_ICON_NAMES],
  ['file input', registerFileInputIcons, FILE_INPUT_ICON_NAMES],
  ['static page', registerStaticPageIcons, STATIC_PAGE_ICON_NAMES],
  ['breadcrumb', registerBreadcrumbIcons, BREADCRUMB_ICON_NAMES],
];

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
    expect(getIcon('registry-test:point')?.body).toContain('<circle'); // the alias
  });

  it('can be called again and again', () => {
    const registry = createIconRegistry(sets);

    registry.register();
    registry.register();

    expect(getIcon('registry-test:dot')).toBeTruthy();
  });
});

describe.each(GROUPS)('the bundled icons of %s', (_name, register, names) => {
  it('lists some icons, each once', () => {
    expect(names.length).toBeGreaterThan(0);
    expect(new Set(names).size).toBe(names.length);
  });

  it('are all in Iconify once registered, with a drawing and a size, with no network', () => {
    register();

    for (const name of names) {
      const icon = getIcon(name);

      expect(icon, name).toBeTruthy();
      expect(icon?.body.length, name).toBeGreaterThan(10);
      expect(icon?.width, name).toBeGreaterThan(0);
      expect(icon?.height, name).toBeGreaterThan(0);
    }
  });

  it('take the colour of the text, except the coloured ones', () => {
    register();

    for (const name of names) {
      const body = getIcon(name)?.body ?? '';

      // `streamline-ultimate-color` is a coloured icon on purpose (the stars of a rating)
      if (name.startsWith('streamline-ultimate-color:')) continue;

      expect(body, name).toContain('currentColor');
    }
  });
});
