// @vitest-environment node
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

// Every import path of the package, loaded as it is in the source.
const modules = import.meta.glob<Record<string, unknown>>('./*/index.ts', { eager: true });
const root = await import('./index.js');

const exportsOf = (path: string) => Object.keys(modules[`./${path}/index.ts`] ?? {}).sort();

// What the package gives to the apps, per import path. Nothing else may be reachable: an internal
// helper that leaks becomes a promise to keep it. A path that few screens use is not in the root.
import { IN_ROOT } from './test-utils/entries.js';

const API: Record<string, string[]> = {
  auth: ['AuthBottomInstructions', 'SocialAuth'],
  breadcrumb: ['Breadcrumb', 'getBreadcrumbItems'],
  'color-input': ['ColorInput'],
  'file-input': ['FileInput', 'getMediaType'],
  'hierarchy-select': ['HierarchySelect'],
  inputs: [
    'Checkbox',
    'Input',
    'InputError',
    'InputIcon',
    'InputLabel',
    'Radio',
    'Select',
    'Textarea',
  ],
  layout: [
    'ApiStatus',
    'BACK_ONLINE_TOAST_MS',
    'BorderGradient',
    'ConfirmModal',
    'Dropdown',
    'LoadingPage',
    'LoadingRings',
    'LoadingText',
    'ModalWrapper',
    'NetworkStatusToaster',
    'ScrollToTop',
    'ScrollableGradientContainer',
    'Skeleton',
    'Table',
    'TableBody',
    'TableHead',
    'TableHeadCell',
    'TableRow',
    'TableRowCell',
  ],
  'linear-gradient': ['LinearGradient'],
  'loading-screen': ['BEAUTY_FACTS', 'LoadingScreen', 'Teddy', 'WakeUpProgress'],
  media: [
    'MEDIA_LABELS',
    'MediaCarousel',
    'MediaCarouselWithModal',
    'MediaCarouselWithParentMedia',
    'MediaModal',
    'VideoPlayer',
    'captureVideoPoster',
  ],
  resend: ['Resend'],
  'static-page': [
    'Checklist',
    'EmailUsAction',
    'HighlightNote',
    'InfoCard',
    'InfoCardGrid',
    'LastUpdatedBadge',
    'NumberedSteps',
    'StaticPageCTA',
    'StaticPageHeader',
    'StaticPageLayout',
    'StaticPageSection',
  ],
  stepper: ['Stepper'],
  testimonials: ['TestimonialCarousel'],
  theme: ['Theme'],
  toast: [
    'TOAST_ICON_NAMES',
    'ToastContainer',
    'Toaster',
    'getFormDataFiles',
    'getUploadItemFilesDone',
    'getUploadItemPercent',
    'getUploadsSummary',
    'isUploadItemSettled',
  ],
  ui: ['Badge', 'Button', 'Divider', 'GradientText', 'Tooltip'],
};

const packageDir = new URL('../', import.meta.url);
const packageJson = JSON.parse(readFileSync(new URL('package.json', packageDir), 'utf8')) as {
  exports: Record<string, unknown>;
};

describe('the public API of the package', () => {
  it('has a path for every folder that has an index, and a folder for every path', () => {
    const folders = readdirSync(fileURLToPath(new URL('src/', packageDir)), { withFileTypes: true })
      .filter(
        (entry) =>
          entry.isDirectory() &&
          existsSync(fileURLToPath(new URL(`src/${entry.name}/index.ts`, packageDir))),
      )
      .map((entry) => entry.name);
    const paths = Object.entries(packageJson.exports)
      .filter(([path, target]) => path !== '.' && typeof target === 'object')
      .map(([path]) => path.slice(2));

    expect(folders.sort()).toEqual(paths.sort());
    expect(Object.keys(API).sort()).toEqual(paths.sort());
  });

  it.each(Object.entries(API))('exports exactly these values from /%s', (path, names) => {
    expect(exportsOf(path)).toEqual([...names].sort());
  });

  it('exports from the root exactly what the paths that most screens use export', () => {
    const names = IN_ROOT.flatMap(exportsOf);

    expect(Object.keys(root).sort()).toEqual([...names].sort());
  });

  // `export *` of two paths that have the same name leaves that name out of the root, with no error.
  it('has no name that two of the paths of the root share', () => {
    const names = IN_ROOT.flatMap(exportsOf);

    expect(names.filter((name, index) => names.indexOf(name) !== index)).toEqual([]);
  });

  // The root re-exports, it does not copy (see `tsup.config.ts` and `built-files.test.ts`).
  it('gives the very same values from the root and from its paths, not copies', () => {
    const source: Record<string, unknown> = {};
    for (const path of IN_ROOT) Object.assign(source, modules[`./${path}/index.ts`]);

    for (const [name, value] of Object.entries(root)) {
      expect(value, name).toBe(source[name]);
    }
  });

  it('does not put in the root what has a path of its own', () => {
    const own = Object.keys(API).filter((path) => !IN_ROOT.includes(path));

    for (const path of own) {
      for (const name of exportsOf(path))
        expect(Object.keys(root), `${path}: ${name}`).not.toContain(name);
    }
  });

  // The store is the app's: it makes it with `createToastStore` and gets its toaster from
  // `createToaster`, both of `@beautinique/frontend-stores`. If this package made a store itself, or a
  // toaster that has one, and exported it, there would be two ways to get one.
  it('does not export a toast store, nor a toaster that has one of its own', () => {
    for (const name of [
      'useToastStore',
      'createToastStore',
      'createToaster',
      'toaster',
      'withProgressToast',
      'createUploadsToast',
      'withUploadsToast',
      'runUploadsInToast',
    ]) {
      expect(Object.keys(root), name).not.toContain(name);
      expect(exportsOf('toast'), name).not.toContain(name);
    }
  });
});
