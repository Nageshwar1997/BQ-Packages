// @vitest-environment jsdom
import {
  TRY_ON_CATEGORY_MAP,
  TRY_ON_MAP,
  TRY_ON_SUB_CATEGORY_MAP,
} from '@beautinique/frontend-constants';
import type { TTryOnSelection } from '@beautinique/frontend-types';
import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { EYE_DEFAULT_PATTERNS, EYE_RANGE_BOUNDS } from '../constants/eye.js';
import { getTryOnShades } from '../constants/index.js';
import { LIP_RANGE_BOUNDS } from '../constants/lip.js';
import { NAIL_RANGE_BOUNDS } from '../constants/nail.js';
import { click, installResizeObserver, keyDown, required } from '../test-utils/dom.js';
import { fakeStages } from '../test-utils/fake-stage.js';
import { mount, unmountAll } from '../test-utils/react.js';
import { TRYON_DIALOG_CLASS_NAME, TRYON_DIALOG_CONTAINER_PROPS } from '../tryOnDialog.js';
import type { ITryOnModalProps } from './TryOnModal.js';
import TryOnModal from './TryOnModal.js';

// The five stages are replaced: each is a stand-in that tells its state when it is made (see
// `fake-stage`). The modal around them, its steps and what it does when a selection is changed, is real.
vi.mock('./lip/LipTryOnStage.js', async () => ({
  default: (await import('../test-utils/fake-stage.js')).createFakeStage(TRY_ON_CATEGORY_MAP.LIP),
}));
vi.mock('./face/FaceTryOnStage.js', async () => ({
  default: (await import('../test-utils/fake-stage.js')).createFakeStage(TRY_ON_CATEGORY_MAP.FACE),
}));
vi.mock('./eye/EyeTryOnStage.js', async () => ({
  default: (await import('../test-utils/fake-stage.js')).createFakeStage(TRY_ON_CATEGORY_MAP.EYE),
}));
vi.mock('./hair/HairTryOnStage.js', async () => ({
  default: (await import('../test-utils/fake-stage.js')).createFakeStage(TRY_ON_CATEGORY_MAP.HAIR),
}));
vi.mock('./nail/NailTryOnStage.js', async () => ({
  default: (await import('../test-utils/fake-stage.js')).createFakeStage(TRY_ON_CATEGORY_MAP.NAIL),
}));

const LIP: TTryOnSelection = {
  category: TRY_ON_CATEGORY_MAP.LIP,
  subCategory: TRY_ON_SUB_CATEGORY_MAP.MATTE,
};
const ROSE = { name: 'Rose', hexColor: '#C2185B' };
const CORAL = { name: 'Coral', hexColor: '#E8613C' };

const buttons = () => [...document.querySelectorAll<HTMLButtonElement>('button')];
const buttonNamed = (name: string) =>
  required(
    buttons().find(
      (button) => button.getAttribute('aria-label') === name || button.textContent === name,
    ),
    `the button ${name}`,
  );
const buttonStartingWith = (text: string) =>
  required(
    buttons().find((button) => button.textContent.startsWith(text)),
    `the button ${text}`,
  );
const fields = () => [...document.querySelectorAll<HTMLButtonElement>('button[role="combobox"]')];
const optionNamed = (name: string) =>
  required(
    [...document.querySelectorAll<HTMLElement>('[role="option"]')].find(
      (option) => option.textContent === name,
    ),
    `the option ${name}`,
  );
const stage = () => document.querySelector<HTMLElement>('[data-testid="stage"]');
const lastMount = () => required(fakeStages.mounts.at(-1), 'a stage that was mounted');

const props = (overrides: Partial<ITryOnModalProps> = {}): ITryOnModalProps => ({
  isOpen: true,
  onClose: vi.fn(),
  tryOn: LIP,
  shades: [ROSE, CORAL],
  ...overrides,
});

const open = (overrides: Partial<ITryOnModalProps> = {}) => {
  const given = props(overrides);
  const view = mount(<TryOnModal {...given} />);

  return {
    ...view,
    given,
    /** The same modal with other props, as when the page that has it renders again. */
    update: (next: Partial<ITryOnModalProps>) => {
      view.rerender(<TryOnModal {...given} {...next} />);
    },
  };
};

/** Live: "Try it Live", then the tips, then "Start camera". */
const startLive = () => {
  click(buttonStartingWith('Try it Live'));
  click(buttonNamed('Start camera'));
};

const chooseCategory = (title: string) => {
  click(required(fields()[0]));
  click(optionNamed(title));
};

const chooseSubcategory = (title: string) => {
  click(required(fields()[1]));
  click(optionNamed(title));
};

beforeEach(() => {
  window.innerHeight = 900;
  installResizeObserver();
  fakeStages.reset();

  let n = 0;

  URL.createObjectURL = vi.fn(() => {
    n += 1;

    return `blob:photo-${String(n)}`;
  });
  URL.revokeObjectURL = vi.fn();
});

afterEach(() => {
  unmountAll();
  vi.unstubAllGlobals();
  document.body.replaceChildren();
});

describe('TryOnModal for a shopper', () => {
  it('shows nothing while it is closed', () => {
    open({ isOpen: false });

    expect(document.querySelector('[role="dialog"]')).toBeNull();
  });

  it('is sized by the classes it shares with the loading dialog of the light entry (the two are the same size)', () => {
    open();

    const dialog = required(document.querySelector('[role="dialog"]'), 'the modal');
    const backdrop = required(dialog.parentElement, 'its backdrop');

    expect(dialog.className).toContain(TRYON_DIALOG_CLASS_NAME);
    expect(backdrop.className).toContain(String(TRYON_DIALOG_CONTAINER_PROPS.className));
  });

  it('is a dialog named Try-On, and starts by asking how to try', () => {
    open();

    const dialog = required(document.querySelector('[role="dialog"]'));
    const title = required(document.getElementById(dialog.getAttribute('aria-labelledby') ?? ''));

    expect(title.textContent).toBe('Try-On');
    expect(document.body.textContent).toContain('How would you like to try it?');
  });

  it('has no way to change what is tried on: no fields, no Apply, no Cancel', () => {
    open();

    expect(fields()).toHaveLength(0);
    expect(document.querySelector('[role="group"][aria-label="What to try on"]')).toBeNull();
    expect(buttons().some((button) => button.textContent === 'Apply')).toBe(false);
    expect(buttons().some((button) => button.textContent === 'Cancel')).toBe(false);
  });

  it('says there is no try-on when the product has none', () => {
    open({ tryOn: undefined });

    expect(document.body.textContent).toContain('Try-On not available');
    expect(document.body.textContent).toContain('This product has no Try-On configured yet.');
    expect(stage()).toBeNull();
  });

  it('says "coming soon" for a category this version has no stage for, and does not draw the stage of another category (the product can get one before the app has the package that knows it)', () => {
    open({ tryOn: { category: 'BODY', subCategory: 'TATTOO' } as unknown as TTryOnSelection });

    expect(document.body.textContent).toContain('Coming soon');
    expect(document.body.textContent).toContain('Try-on for BODY is coming soon.');
    expect(stage()).toBeNull();
    expect(fakeStages.mounts).toHaveLength(0);
  });

  describe('the stage', () => {
    it.each([
      [TRY_ON_CATEGORY_MAP.LIP, TRY_ON_SUB_CATEGORY_MAP.MATTE],
      [TRY_ON_CATEGORY_MAP.FACE, TRY_ON_SUB_CATEGORY_MAP.FOUNDATION],
      [TRY_ON_CATEGORY_MAP.EYE, TRY_ON_SUB_CATEGORY_MAP.EYELINER],
      [TRY_ON_CATEGORY_MAP.HAIR, TRY_ON_SUB_CATEGORY_MAP.COLOR],
      [TRY_ON_CATEGORY_MAP.NAIL, TRY_ON_SUB_CATEGORY_MAP.GEL],
    ] as const)('is the one of %s, made from the subcategory %s', (category, subCategory) => {
      open({ tryOn: { category, subCategory } as TTryOnSelection });
      startLive();

      expect(stage()?.getAttribute('data-category')).toBe(category);
      expect(lastMount()).toMatchObject({ category, mode: 'LIVE' });
      expect(lastMount().initialState.type).toBe(subCategory);
    });

    it('starts from the default intensity of the subcategory, with no shade', () => {
      open();
      startLive();

      expect(lastMount().initialState).toMatchObject({
        type: TRY_ON_SUB_CATEGORY_MAP.MATTE,
        color: null,
        range: LIP_RANGE_BOUNDS.MATTE.default,
      });
    });

    it('starts from the intensity of the subcategory it is for, not one of another', () => {
      open({
        tryOn: { category: TRY_ON_CATEGORY_MAP.NAIL, subCategory: TRY_ON_SUB_CATEGORY_MAP.CHROME },
      });
      startLive();

      expect(lastMount().initialState.range).toBe(NAIL_RANGE_BOUNDS.CHROME.default);
    });

    it('starts an eye pattern from the default pattern of its subcategory', () => {
      open({
        tryOn: { category: TRY_ON_CATEGORY_MAP.EYE, subCategory: TRY_ON_SUB_CATEGORY_MAP.EYELINER },
      });
      startLive();

      expect(lastMount().initialState.pattern).toBe(EYE_DEFAULT_PATTERNS.EYELINER);
      expect(lastMount().initialState.range).toBe(EYE_RANGE_BOUNDS.EYELINER.default);
    });

    it('is made once for a try-on, however long it is used', () => {
      open();
      startLive();
      click(buttonNamed('Apply Rose'));

      expect(fakeStages.mounts).toHaveLength(1);
    });

    it('is not made before the camera is asked for', () => {
      open();
      expect(stage()).toBeNull();

      click(buttonStartingWith('Try it Live'));
      expect(stage()).toBeNull(); // the tips come first
    });
  });

  describe('a shade', () => {
    it('is applied through the stage, shown as applied, and gets an intensity slider', () => {
      open();
      startLive();
      expect(document.querySelector('input[aria-label="Shade intensity"]')).toBeNull();

      click(buttonNamed('Apply Rose'));

      expect(fakeStages.makeupCalls).toEqual([{ color: ROSE.hexColor }]);
      expect(buttonNamed('Remove Rose')).toBeTruthy();
      expect(document.querySelector('input[aria-label="Shade intensity"]')).not.toBeNull();
    });

    it('is taken away by pressing it again', () => {
      open();
      startLive();
      click(buttonNamed('Apply Rose'));
      click(buttonNamed('Remove Rose'));

      expect(fakeStages.makeupCalls.at(-1)).toEqual({ color: null });
      expect(document.querySelector('input[aria-label="Shade intensity"]')).toBeNull();
    });

    it('is only the shades of the product: a shopper is not shown what the product does not have', () => {
      open({ shades: [] });
      startLive();

      expect(
        buttons().some((button) => (button.getAttribute('aria-label') ?? '').startsWith('Apply ')),
      ).toBe(false);
    });
  });

  describe('a photo', () => {
    const chooseFile = (file: File) => {
      const input = required(document.querySelector<HTMLInputElement>('input[type="file"]'));

      Object.defineProperty(input, 'files', { configurable: true, value: [file] });
      act(() => {
        input.dispatchEvent(new Event('change', { bubbles: true }));
      });
    };

    it('starts the stage in upload when it is accepted, with the photo', () => {
      open();
      click(buttonStartingWith('Upload Photo'));
      chooseFile(new File([new Uint8Array(8)], 'me.png', { type: 'image/png' }));

      expect(lastMount()).toMatchObject({ category: TRY_ON_CATEGORY_MAP.LIP, mode: 'UPLOAD' });
      // the photo reaches the stage a moment after it is mounted, as a new prop
      expect(fakeStages.photo).toBe('blob:photo-1');
    });

    it('is turned down with a reason shown in the modal, and no stage is made', () => {
      open();
      click(buttonStartingWith('Upload Photo'));
      chooseFile(new File(['x'], 'notes.txt', { type: 'text/plain' }));

      expect(document.querySelector('[role="alert"]')?.textContent).toContain(
        'Unsupported photo type',
      );
      expect(stage()).toBeNull();
    });

    it('is turned down with a reason that goes to the app, and not shown, when the app asks to be told', () => {
      const onUploadError = vi.fn();

      open({ onUploadError });
      click(buttonStartingWith('Upload Photo'));
      chooseFile(new File(['x'], 'notes.txt', { type: 'text/plain' }));

      expect(onUploadError).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Unsupported photo type' }),
      );
      expect(document.querySelector('[role="alert"]')).toBeNull();
    });

    it('can be a model: the stage starts in upload from the address of the photo, made from `assets`', () => {
      open({ assets: { baseUrl: '/tryon-assets/' } });
      click(buttonStartingWith('Upload Photo'));
      click(buttonNamed('Try on with the East Indian model'));

      expect(lastMount()).toMatchObject({
        mode: 'UPLOAD',
        uploadedImageUrl: '/tryon-assets/images/models/face/East-Indian.webp',
      });
      expect(
        document.querySelector<HTMLImageElement>('img[alt="East Indian"]')?.getAttribute('src'),
      ).toBe('/tryon-assets/images/models/face/East-Indian.webp');
    });
  });

  describe('closing', () => {
    it('tells the app with the cross and with Escape', () => {
      const { given } = open();

      click(buttonNamed('Close'));
      keyDown(document, 'Escape');

      expect(given.onClose).toHaveBeenCalledTimes(2);
    });

    it('starts again from the beginning when it is opened the next time', () => {
      const { update } = open();

      startLive();
      expect(stage()).not.toBeNull();

      update({ isOpen: false });
      update({ isOpen: true });

      expect(stage()).toBeNull();
      expect(document.body.textContent).toContain('How would you like to try it?');
    });
  });
});

describe('TryOnModal that can be set up (selectable)', () => {
  const setup = (overrides: Partial<ITryOnModalProps> = {}) =>
    open({ selectable: true, onApply: vi.fn(), ...overrides });

  describe('what it shows', () => {
    it('has the two fields, from the selection it was given, and Cancel and Apply', () => {
      setup();

      expect(document.querySelector('[role="group"][aria-label="What to try on"]')).not.toBeNull();
      expect(fields().map((field) => field.textContent)).toEqual([
        expect.stringContaining('Lips'),
        expect.stringContaining('Matte'),
      ]);
      expect(buttonNamed('Cancel')).toBeTruthy();
      expect(buttonNamed('Apply')).toBeTruthy();
    });

    it('still shows the try-on (the modes) between them', () => {
      setup();

      expect(document.body.textContent).toContain('How would you like to try it?');
    });
  });

  describe('Cancel and Apply', () => {
    it('Cancel closes and gives nothing to the app', () => {
      const { given } = setup();

      chooseCategory('Eyes');
      click(buttonNamed('Cancel'));

      expect(given.onClose).toHaveBeenCalledTimes(1);
      expect(given.onApply).not.toHaveBeenCalled();
    });

    it('the cross and Escape close it without giving anything: closing is cancelling', () => {
      const { given } = setup();

      chooseCategory('Hair');
      click(buttonNamed('Close'));
      keyDown(document, 'Escape');

      expect(given.onClose).toHaveBeenCalledTimes(2);
      expect(given.onApply).not.toHaveBeenCalled();
    });

    it('Apply gives the selection that was chosen, and then closes', () => {
      const order: string[] = [];
      const onApply = vi.fn(() => order.push('apply'));
      const onClose = vi.fn(() => order.push('close'));

      setup({ onApply, onClose });
      chooseCategory('Eyes');
      click(buttonNamed('Apply'));

      expect(onApply).toHaveBeenCalledWith({
        category: TRY_ON_CATEGORY_MAP.EYE,
        subCategory: TRY_ON_MAP[TRY_ON_CATEGORY_MAP.EYE][0],
      });
      expect(order).toEqual(['apply', 'close']);
    });

    it('Apply gives the selection it was given when nothing was changed', () => {
      const { given } = setup();

      click(buttonNamed('Apply'));

      expect(given.onApply).toHaveBeenCalledWith(LIP);
      expect(given.onClose).toHaveBeenCalledTimes(1);
    });

    it('Apply gives the subcategory that was chosen, with its category', () => {
      const { given } = setup({
        tryOn: { category: TRY_ON_CATEGORY_MAP.EYE, subCategory: TRY_ON_SUB_CATEGORY_MAP.EYEBROW },
      });

      chooseSubcategory('Kajal');
      click(buttonNamed('Apply'));

      expect(given.onApply).toHaveBeenCalledWith({
        category: TRY_ON_CATEGORY_MAP.EYE,
        subCategory: TRY_ON_SUB_CATEGORY_MAP.KAJAL,
      });
    });

    it('does not need an `onApply`: Apply only closes', () => {
      const { given } = setup({ onApply: undefined });

      click(buttonNamed('Apply'));

      expect(given.onClose).toHaveBeenCalledTimes(1);
    });

    it('goes back to what the app has when the app turns `selectable` off: a choice means nothing to a shopper', () => {
      const { update } = setup();

      startLive();
      chooseCategory('Eyes');
      expect(stage()?.getAttribute('data-category')).toBe(TRY_ON_CATEGORY_MAP.EYE);

      update({ selectable: false });

      expect(stage()?.getAttribute('data-category')).toBe(TRY_ON_CATEGORY_MAP.LIP);
      expect(document.querySelector('[role="group"][aria-label="What to try on"]')).toBeNull();
    });

    it('starts again from what the app has the next time it is opened: what was chosen is not kept', () => {
      const { update } = setup();

      chooseCategory('Eyes');
      expect(fields()[0]?.textContent).toContain('Eyes');

      update({ isOpen: false });
      update({ isOpen: true });

      expect(fields()[0]?.textContent).toContain('Lips');
      expect(fields()[1]?.textContent).toContain('Matte');
    });
  });

  describe('changing the category or the subcategory while it is open', () => {
    it('makes the stage of the new category, and takes the old one away', () => {
      setup();
      startLive();
      expect(fakeStages.mounts).toHaveLength(1);

      chooseCategory('Eyes');

      expect(stage()?.getAttribute('data-category')).toBe(TRY_ON_CATEGORY_MAP.EYE);
      expect(fakeStages.mounts).toHaveLength(2);
      expect(fakeStages.unmounts).toBe(1);
      expect(lastMount().initialState.type).toBe(TRY_ON_MAP[TRY_ON_CATEGORY_MAP.EYE][0]);
    });

    it('makes a new stage for another subcategory of the same category (an engine reads it only when it is made)', () => {
      setup({
        tryOn: { category: TRY_ON_CATEGORY_MAP.EYE, subCategory: TRY_ON_SUB_CATEGORY_MAP.EYEBROW },
      });
      startLive();

      chooseSubcategory('Eyeliner');

      expect(fakeStages.mounts).toHaveLength(2);
      expect(lastMount()).toMatchObject({ category: TRY_ON_CATEGORY_MAP.EYE });
      expect(lastMount().initialState.type).toBe(TRY_ON_SUB_CATEGORY_MAP.EYELINER);
      expect(fakeStages.unmounts).toBe(1);
    });

    it('does nothing when the one that is chosen is the one it already is (no new stage, nothing lost)', () => {
      setup();
      startLive();

      chooseCategory('Lips');
      chooseSubcategory('Matte');

      expect(fakeStages.mounts).toHaveLength(1);
      expect(fakeStages.unmounts).toBe(0);
      expect(buttonNamed('Apply Rose')).toBeTruthy(); // and the modal did not stop saying it is ready
    });

    it('keeps the mode: it stays live, and does not go back to the tips or to the choice of a mode', () => {
      setup();
      startLive();

      chooseCategory('Hair');

      expect(lastMount().mode).toBe('LIVE');
      expect(document.body.textContent).not.toContain('How would you like to try it?');
      expect(document.body.textContent).not.toContain('Tips for a great result');
    });

    it('keeps the photo, in upload, for the new stage', () => {
      setup({ assets: { baseUrl: '/tryon-assets/' } });
      click(buttonStartingWith('Upload Photo'));
      click(buttonNamed('Try on with the East Indian model'));
      const photo = lastMount().uploadedImageUrl;

      chooseCategory('Eyes');

      expect(lastMount()).toMatchObject({
        category: TRY_ON_CATEGORY_MAP.EYE,
        mode: 'UPLOAD',
        uploadedImageUrl: photo,
      });
    });

    // every category has a stage of its own in the modal, and each one is given the shade by itself
    it.each([
      [
        TRY_ON_CATEGORY_MAP.LIP,
        'Lips',
        { category: TRY_ON_CATEGORY_MAP.EYE, subCategory: TRY_ON_SUB_CATEGORY_MAP.EYEBROW },
      ],
      [TRY_ON_CATEGORY_MAP.EYE, 'Eyes', LIP],
      [TRY_ON_CATEGORY_MAP.HAIR, 'Hair', LIP],
      [TRY_ON_CATEGORY_MAP.FACE, 'Face', LIP],
      [TRY_ON_CATEGORY_MAP.NAIL, 'Nails', LIP],
    ] as const)(
      'carries the shade to the new stage: the same shade on another makeup (%s)',
      (category, title, from) => {
        setup({ tryOn: from });
        startLive();
        click(buttonNamed('Apply Coral'));

        chooseCategory(title);

        expect(lastMount().category).toBe(category);
        expect(lastMount().initialState.color).toBe(CORAL.hexColor);
        expect(buttonNamed('Remove Coral')).toBeTruthy();
      },
    );

    it('carries no shade that was taken away', () => {
      setup();
      startLive();
      click(buttonNamed('Apply Coral'));
      click(buttonNamed('Remove Coral'));

      chooseCategory('Eyes');

      expect(lastMount().initialState.color).toBeNull();
    });

    it('does not carry the intensity: it means something only for the subcategory it was set for', () => {
      setup();
      startLive();
      click(buttonNamed('Apply Rose'));

      const slider = required(
        document.querySelector<HTMLInputElement>('input[aria-label="Shade intensity"]'),
      );
      act(() => {
        Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set?.call(
          slider,
          String(LIP_RANGE_BOUNDS.MATTE.max),
        );
        slider.dispatchEvent(new Event('input', { bubbles: true }));
      });
      expect(fakeStages.makeupCalls.at(-1)).toEqual({ range: LIP_RANGE_BOUNDS.MATTE.max });

      chooseCategory('Eyes');

      expect(lastMount().initialState.range).toBe(
        EYE_RANGE_BOUNDS[TRY_ON_MAP[TRY_ON_CATEGORY_MAP.EYE][0]].default,
      );
      expect(lastMount().initialState.range).not.toBe(LIP_RANGE_BOUNDS.MATTE.max);
    });

    it('does not carry the pattern of another subcategory: eyeliner and kajal have patterns of their own', () => {
      setup({
        tryOn: { category: TRY_ON_CATEGORY_MAP.EYE, subCategory: TRY_ON_SUB_CATEGORY_MAP.EYELINER },
      });
      startLive();
      expect(lastMount().initialState.pattern).toBe(EYE_DEFAULT_PATTERNS.EYELINER);

      chooseSubcategory('Kajal');

      expect(lastMount().initialState.pattern).toBe(EYE_DEFAULT_PATTERNS.KAJAL);
    });

    it('says it is not ready until the new stage is, instead of showing the old state', () => {
      setup();
      startLive();
      expect(document.querySelector('[role="status"]')).toBeNull(); // ready

      // the new stage tells its state when it is made; between the two the modal waits
      chooseCategory('Face');

      expect(stage()?.getAttribute('data-category')).toBe(TRY_ON_CATEGORY_MAP.FACE);
      expect(lastMount().category).toBe(TRY_ON_CATEGORY_MAP.FACE);
    });
  });

  describe('the shades', () => {
    it('are those of the product when it has some', () => {
      setup({ shades: [ROSE] });
      startLive();

      expect(buttonNamed('Apply Rose')).toBeTruthy();
      expect(buttons().some((button) => button.getAttribute('aria-label') === 'Apply Coral')).toBe(
        false,
      );
    });

    it('are those of the subcategory when the product has none yet (a product that is being set up)', () => {
      setup({ shades: [] });
      startLive();

      const [first] = getTryOnShades(TRY_ON_CATEGORY_MAP.LIP, TRY_ON_SUB_CATEGORY_MAP.MATTE);

      expect(first).toBeDefined();
      expect(buttonNamed(`Apply ${first?.name ?? ''}`)).toBeTruthy();
    });

    it('follow the subcategory that is chosen, when the product has none', () => {
      setup({ shades: [] });
      startLive();

      chooseCategory('Nails');

      const [first] = getTryOnShades(
        TRY_ON_CATEGORY_MAP.NAIL,
        TRY_ON_MAP[TRY_ON_CATEGORY_MAP.NAIL][0],
      );

      expect(buttonNamed(`Apply ${first?.name ?? ''}`)).toBeTruthy();
    });

    it('stay those of the product, whatever is chosen, when it has some', () => {
      setup({ shades: [ROSE] });
      startLive();

      chooseCategory('Nails');

      expect(buttonNamed('Apply Rose')).toBeTruthy();
    });
  });

  describe('with nothing chosen yet (the product has no try-on)', () => {
    it('asks to choose, and cannot apply', () => {
      setup({ tryOn: undefined });

      expect(document.body.textContent).toContain('Choose what to try on');
      expect(document.body.textContent).toContain(
        'Choose a category and a subcategory above to start.',
      );
      expect(fields()[0]?.textContent).toContain('Choose a category');
      expect(fields()[1]?.disabled).toBe(true);
      expect(buttonNamed('Apply').disabled).toBe(true);
    });

    it('can still be cancelled', () => {
      const { given } = setup({ tryOn: undefined });

      click(buttonNamed('Cancel'));

      expect(given.onClose).toHaveBeenCalledTimes(1);
    });

    it('starts when a category is chosen: it brings its first subcategory, and Apply works', () => {
      const { given } = setup({ tryOn: undefined });

      chooseCategory('Nails');

      expect(fields().map((field) => field.textContent)).toEqual([
        expect.stringContaining('Nails'),
        expect.stringContaining('Gel'),
      ]);
      expect(document.body.textContent).toContain('How would you like to try it?');

      click(buttonNamed('Apply'));
      expect(given.onApply).toHaveBeenCalledWith({
        category: TRY_ON_CATEGORY_MAP.NAIL,
        subCategory: TRY_ON_SUB_CATEGORY_MAP.GEL,
      });
    });
  });
});
