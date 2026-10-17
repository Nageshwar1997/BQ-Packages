// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { TRY_ON_CATEGORY_MAP } from '@beautinique/frontend-constants';
import { DEFAULT_TRYON_ASSETS_BASE_URL } from '../constants/assets.js';
import { EYE_PATTERNS } from '../constants/eye.js';
import {
  getTryOnInstructions,
  TRYON_MODE_MAP,
  TRYON_MODEL_IMAGES_FACE,
  TRYON_MODEL_IMAGES_HAIR,
  TRYON_MODEL_IMAGES_HAND,
} from '../constants/index.js';
import { click, installResizeObserver, required } from '../test-utils/dom.js';
import { mount, unmountAll } from '../test-utils/react.js';
import type { ITryOnAssets } from '../types/assets.js';
import { TryOnAssetsProvider } from './TryOnAssetsContext.js';
import TryOnInstructions from './TryOnInstructions.js';
import TryOnModelList from './TryOnModelList.js';
import TryOnPatternSwatches from './TryOnPatternSwatches.js';

const withAssets = (element: React.ReactElement, assets?: ITryOnAssets) => (
  <TryOnAssetsProvider value={assets}>{element}</TryOnAssetsProvider>
);

const buttons = () => [...document.querySelectorAll<HTMLButtonElement>('button')];
const images = () => [...document.querySelectorAll<HTMLImageElement>('img')];

beforeEach(() => {
  installResizeObserver();
});

afterEach(() => {
  unmountAll();
  vi.unstubAllGlobals();
  document.body.replaceChildren();
});

describe('TryOnModelList', () => {
  const list = (props: Partial<React.ComponentProps<typeof TryOnModelList>> = {}) => (
    <TryOnModelList
      direction="vertical"
      category={TRY_ON_CATEGORY_MAP.LIP}
      mode={TRYON_MODE_MAP.LIVE}
      previewImageUrl={null}
      onModelSelect={vi.fn()}
      {...props}
    />
  );

  describe('which models', () => {
    it.each([
      [TRY_ON_CATEGORY_MAP.LIP, TRYON_MODEL_IMAGES_FACE],
      [TRY_ON_CATEGORY_MAP.FACE, TRYON_MODEL_IMAGES_FACE],
      [TRY_ON_CATEGORY_MAP.EYE, TRYON_MODEL_IMAGES_FACE],
      [TRY_ON_CATEGORY_MAP.HAIR, TRYON_MODEL_IMAGES_HAIR],
      [TRY_ON_CATEGORY_MAP.NAIL, TRYON_MODEL_IMAGES_HAND],
    ] as const)('%s has the photos that the model of its category can read', (category, paths) => {
      mount(withAssets(list({ category })));

      expect(images().map((image) => image.src)).toEqual(
        paths.map((path) => `${DEFAULT_TRYON_ASSETS_BASE_URL}${path}`),
      );
    });

    it('has six, each with a name that tells it from the others', () => {
      mount(withAssets(list()));

      const names = buttons().map((button) => button.getAttribute('aria-label'));

      expect(names).toHaveLength(6);
      expect(new Set(names).size).toBe(6);
      expect(names[0]).toBe('Try on with the North Indian model');
    });

    it('gives each photo the alternative text of its name', () => {
      mount(withAssets(list()));

      expect(images().map((image) => image.alt)).toEqual([
        'North Indian',
        'East Indian',
        'West Indian',
        'Northeast Indian',
        'Central Indian',
        'South Indian',
      ]);
    });

    it('loads the photos lazily: most of them are not on the screen when the modal opens', () => {
      mount(withAssets(list()));

      expect(images().every((image) => image.getAttribute('loading') === 'lazy')).toBe(true);
    });
  });

  describe('where the photos are', () => {
    it('comes from the CDN unless it is told another place', () => {
      mount(list());

      expect(images()[0]?.src).toBe(
        `${DEFAULT_TRYON_ASSETS_BASE_URL}${TRYON_MODEL_IMAGES_FACE[0] ?? ''}`,
      );
    });

    it('comes from `assets.baseUrl`', () => {
      mount(withAssets(list(), { baseUrl: '/tryon-assets/' }));

      expect(images()[0]?.getAttribute('src')).toBe(
        `/tryon-assets/${TRYON_MODEL_IMAGES_FACE[0] ?? ''}`,
      );
    });

    it('comes from `assets.resolve` when there is one', () => {
      mount(
        withAssets(list(), {
          resolve: (path) => `https://hashed.example.com/${path.replaceAll('/', '_')}`,
        }),
      );

      expect(images()[0]?.src).toBe(
        `https://hashed.example.com/${(TRYON_MODEL_IMAGES_FACE[0] ?? '').replaceAll('/', '_')}`,
      );
    });
  });

  describe('choosing', () => {
    it('gives the address of the photo, made from `assets`, not its path', () => {
      const onModelSelect = vi.fn();

      mount(withAssets(list({ onModelSelect }), { baseUrl: '/tryon-assets/' }));
      click(required(buttons()[1]));

      expect(onModelSelect).toHaveBeenCalledTimes(1);
      expect(onModelSelect).toHaveBeenCalledWith(
        `/tryon-assets/${TRYON_MODEL_IMAGES_FACE[1] ?? ''}`,
      );
    });

    it('marks the model that is on the screen, in upload, by its address', () => {
      const assets = { baseUrl: '/tryon-assets/' };
      const chosen = `/tryon-assets/${TRYON_MODEL_IMAGES_FACE[2] ?? ''}`;

      mount(withAssets(list({ mode: TRYON_MODE_MAP.UPLOAD, previewImageUrl: chosen }), assets));

      expect(buttons().map((button) => button.getAttribute('aria-pressed'))).toEqual([
        'false',
        'false',
        'true',
        'false',
        'false',
        'false',
      ]);
    });

    it('marks none in live, whatever the preview is', () => {
      const chosen = `${DEFAULT_TRYON_ASSETS_BASE_URL}${TRYON_MODEL_IMAGES_FACE[0] ?? ''}`;

      mount(withAssets(list({ mode: TRYON_MODE_MAP.LIVE, previewImageUrl: chosen })));

      expect(buttons().every((button) => button.getAttribute('aria-pressed') === 'false')).toBe(
        true,
      );
    });

    it('marks none for a photo of the person (not one of the models)', () => {
      mount(withAssets(list({ mode: TRYON_MODE_MAP.UPLOAD, previewImageUrl: 'blob:mine' })));

      expect(buttons().every((button) => button.getAttribute('aria-pressed') === 'false')).toBe(
        true,
      );
    });

    it('cannot be pressed while it is disabled', () => {
      const onModelSelect = vi.fn();

      mount(withAssets(list({ onModelSelect, disabled: true })));

      expect(buttons().every((button) => button.disabled)).toBe(true);
      click(required(buttons()[0]));
      expect(onModelSelect).not.toHaveBeenCalled();
    });
  });
});

describe('TryOnPatternSwatches', () => {
  const patterns = EYE_PATTERNS.EYELINER ?? [];
  const swatches = (props: Partial<React.ComponentProps<typeof TryOnPatternSwatches>> = {}) => (
    <TryOnPatternSwatches patterns={patterns} appliedPattern={null} onSelect={vi.fn()} {...props} />
  );

  it('has patterns to show', () => {
    expect(patterns.length).toBeGreaterThan(3);
  });

  it('shows nothing when there is no pattern to choose from', () => {
    const view = mount(withAssets(swatches({ patterns: [] })));

    expect(view.container.innerHTML).toBe('');
  });

  it('shows a preview for each pattern, from `assets`, named for it', () => {
    mount(withAssets(swatches(), { baseUrl: '/tryon-assets/' }));

    expect(images().map((image) => image.getAttribute('src'))).toEqual(
      patterns.map((pattern) => `/tryon-assets/${pattern.image}`),
    );
    expect(images().map((image) => image.alt)).toEqual(patterns.map((pattern) => pattern.label));
  });

  it('says how many there are, and which one is applied (or asks to pick one)', () => {
    const view = mount(withAssets(swatches()));

    expect(view.container.textContent).toContain(`Styles (${String(patterns.length)})`);
    expect(view.container.textContent).toContain('Pick a style');

    view.rerender(withAssets(swatches({ appliedPattern: patterns[1]?.id ?? null })));
    expect(view.container.textContent).toContain(patterns[1]?.label ?? '');
  });

  it('marks the applied pattern as pressed, and only that one', () => {
    mount(withAssets(swatches({ appliedPattern: patterns[2]?.id ?? null })));

    const pressed = buttons().filter((button) => button.getAttribute('aria-pressed') === 'true');

    expect(pressed).toHaveLength(1);
    expect(pressed[0]?.getAttribute('aria-label')).toBe(
      `Apply ${patterns[2]?.label ?? ''} pattern`,
    );
  });

  it('gives the id of the pattern that is pressed', () => {
    const onSelect = vi.fn();

    mount(withAssets(swatches({ onSelect })));
    click(required(buttons()[3]));

    expect(onSelect).toHaveBeenCalledWith(patterns[3]?.id);
  });

  it('does not take a pattern away by pressing it again: a finish always has a pattern', () => {
    const onSelect = vi.fn();

    mount(withAssets(swatches({ onSelect, appliedPattern: patterns[0]?.id ?? null })));
    click(required(buttons()[0]));

    expect(onSelect).toHaveBeenCalledWith(patterns[0]?.id);
    expect(onSelect).not.toHaveBeenCalledWith(null);
  });

  it('cannot be pressed while it is disabled', () => {
    const onSelect = vi.fn();

    mount(withAssets(swatches({ onSelect, disabled: true })));

    expect(buttons().every((button) => button.disabled)).toBe(true);
    click(required(buttons()[0]));
    expect(onSelect).not.toHaveBeenCalled();
  });
});

describe('TryOnInstructions', () => {
  const screen = (props: Partial<React.ComponentProps<typeof TryOnInstructions>> = {}) => (
    <TryOnInstructions
      mode={TRYON_MODE_MAP.UPLOAD}
      category={TRY_ON_CATEGORY_MAP.LIP}
      onBack={vi.fn()}
      onStartLive={vi.fn()}
      onFileSelected={vi.fn()}
      {...props}
    />
  );

  const buttonNamed = (name: string) =>
    required(
      buttons().find((button) => button.textContent === name),
      name,
    );

  it.each([TRYON_MODE_MAP.LIVE, TRYON_MODE_MAP.UPLOAD])(
    'lists the tips of the category for %s',
    (mode) => {
      mount(screen({ mode, category: TRY_ON_CATEGORY_MAP.HAIR }));

      const tips = getTryOnInstructions(TRY_ON_CATEGORY_MAP.HAIR, mode);

      expect(tips.length).toBeGreaterThan(0);
      for (const { text } of tips) {
        expect(document.body.textContent).toContain(text);
      }
    },
  );

  it('numbers the tips for a screen reader (the icon says nothing to it)', () => {
    mount(screen());

    expect(document.body.textContent).toContain('Tip 1: ');
  });

  describe('in live', () => {
    it('starts the camera with its button, and has no way to choose a photo', () => {
      const onStartLive = vi.fn();

      mount(screen({ mode: TRYON_MODE_MAP.LIVE, onStartLive }));
      click(buttonNamed('Start camera'));

      expect(onStartLive).toHaveBeenCalledTimes(1);
      expect(document.querySelector('input[type="file"]')).toBeNull();
      expect(buttons().some((button) => button.textContent === 'Choose photo')).toBe(false);
    });
  });

  describe('in upload', () => {
    it('opens the chooser of files with its button, for images only', () => {
      mount(screen());

      const input = required(document.querySelector<HTMLInputElement>('input[type="file"]'));
      const open = vi.spyOn(input, 'click').mockImplementation(() => undefined);

      click(buttonNamed('Choose photo'));

      expect(open).toHaveBeenCalledTimes(1);
      expect(input.accept).toContain('image/png');
      expect(input.accept).not.toContain('video');
    });

    it('gives the file that was chosen, and forgets it in the input so the same file can be chosen again', () => {
      const onFileSelected = vi.fn();
      const file = new File(['x'], 'face.png', { type: 'image/png' });

      mount(screen({ onFileSelected }));

      const input = required(document.querySelector<HTMLInputElement>('input[type="file"]'));

      Object.defineProperty(input, 'files', { configurable: true, value: [file] });
      Object.defineProperty(input, 'value', {
        configurable: true,
        writable: true,
        value: 'C:\\fakepath\\face.png',
      });
      input.dispatchEvent(new Event('change', { bubbles: true }));

      expect(onFileSelected).toHaveBeenCalledWith(file);
      expect(input.value).toBe('');
    });

    it('does nothing when the chooser is closed without a file', () => {
      const onFileSelected = vi.fn();

      mount(screen({ onFileSelected }));

      const input = required(document.querySelector<HTMLInputElement>('input[type="file"]'));

      Object.defineProperty(input, 'files', { configurable: true, value: [] });
      input.dispatchEvent(new Event('change', { bubbles: true }));

      expect(onFileSelected).not.toHaveBeenCalled();
    });

    it('keeps the file input out of the way of everyone: it is hidden, and the button is the way in', () => {
      mount(screen());

      expect(document.querySelector('input[type="file"]')?.className).toContain('sr-only');
    });
  });

  it('goes back with Back', () => {
    const onBack = vi.fn();

    mount(screen({ onBack }));
    click(buttonNamed('Back'));

    expect(onBack).toHaveBeenCalledTimes(1);
  });

  describe('a photo that was turned down', () => {
    const error = { title: 'Photo is too large', description: 'This photo is 6 MB.' };

    it('is told in an alert, with its reason', () => {
      mount(screen({ uploadError: error }));

      const alert = required(document.querySelector('[role="alert"]'));

      expect(alert.textContent).toContain('Photo is too large');
      expect(alert.textContent).toContain('This photo is 6 MB.');
    });

    it('is not told when there is none', () => {
      mount(screen());

      expect(document.querySelector('[role="alert"]')).toBeNull();
    });

    it('is not told in live: no photo is chosen there', () => {
      mount(screen({ mode: TRYON_MODE_MAP.LIVE, uploadError: error }));

      expect(document.querySelector('[role="alert"]')).toBeNull();
    });
  });
});
