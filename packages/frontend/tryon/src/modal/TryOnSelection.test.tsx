// @vitest-environment jsdom
import { TRY_ON_CATEGORIES, TRY_ON_MAP } from '@beautinique/frontend-constants';
import type { TTryOnSelection } from '@beautinique/frontend-types';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { click, required } from '../test-utils/dom.js';
import { mount, unmountAll } from '../test-utils/react.js';
import TryOnSelection from './TryOnSelection.js';

const fields = () => [...document.querySelectorAll<HTMLButtonElement>('button[role="combobox"]')];
const field = (index: number) => required(fields()[index], `the field ${String(index)}`);
const options = () => [...document.querySelectorAll<HTMLElement>('[role="option"]')];
const optionNamed = (name: string) =>
  required(
    options().find((option) => option.textContent === name),
    `the option ${name}`,
  );

const open = (index: number) => {
  click(field(index));
};

const setup = (selection?: TTryOnSelection) => {
  const onChange = vi.fn();

  mount(<TryOnSelection selection={selection} onChange={onChange} />);

  return { onChange };
};

describe('TryOnSelection', () => {
  beforeEach(() => {
    window.innerHeight = 900;
  });

  afterEach(() => {
    unmountAll();
    document.body.replaceChildren();
  });

  describe('what it shows', () => {
    it('is a group named for what it is for, with a field for the category and one for the subcategory', () => {
      setup({ category: 'LIP', subCategory: 'MATTE' });

      expect(document.querySelector('[role="group"]')?.getAttribute('aria-label')).toBe(
        'What to try on',
      );
      expect(fields()).toHaveLength(2);
      expect(field(0).textContent).toContain('Lips');
      expect(field(1).textContent).toContain('Matte');
    });

    it('names the fields', () => {
      setup({ category: 'LIP', subCategory: 'MATTE' });

      expect(document.body.textContent).toContain('Category');
      expect(document.body.textContent).toContain('Subcategory');
    });

    it('says what to do while nothing is chosen, and keeps the subcategory shut until a category is', () => {
      setup();

      expect(field(0).textContent).toContain('Choose a category');
      expect(field(1).textContent).toContain('Choose a subcategory');
      expect(field(0).disabled).toBe(false);
      expect(field(1).disabled).toBe(true);
    });

    it('offers every category the try-on has, by the name the shopper knows', () => {
      setup({ category: 'LIP', subCategory: 'MATTE' });
      open(0);

      expect(options().map((option) => option.textContent)).toEqual([
        'Lips',
        'Eyes',
        'Hair',
        'Face',
        'Nails',
      ]);
      // and they are the categories of the product, not an invention of the modal
      expect(options()).toHaveLength(TRY_ON_CATEGORIES.length);
    });

    it('offers the subcategories of the category that is chosen, in words', () => {
      setup({ category: 'FACE', subCategory: 'FOUNDATION' });
      open(1);

      expect(options().map((option) => option.textContent)).toEqual(
        TRY_ON_MAP.FACE.map((name) => `${name.charAt(0)}${name.slice(1).toLowerCase()}`),
      );
      expect(optionNamed('Compactpowder')).toBeTruthy();
    });

    it('writes a subcategory with an underscore as words', () => {
      // the tokens of the map have none today; this is for the day one does
      setup({ category: 'LIP', subCategory: 'MATTE' });
      open(1);

      expect(options().every((option) => !option.textContent.includes('_'))).toBe(true);
    });

    it('marks the chosen ones in the lists', () => {
      setup({ category: 'EYE', subCategory: 'KAJAL' });
      open(0);
      expect(optionNamed('Eyes').getAttribute('aria-selected')).toBe('true');
    });
  });

  describe('choosing a category', () => {
    it('gives a complete selection: the category with its first subcategory', () => {
      const { onChange } = setup({ category: 'LIP', subCategory: 'GLOSS' });

      open(0);
      click(optionNamed('Eyes'));

      expect(onChange).toHaveBeenCalledTimes(1);
      expect(onChange).toHaveBeenCalledWith({ category: 'EYE', subCategory: TRY_ON_MAP.EYE[0] });
    });

    it.each(TRY_ON_CATEGORIES)('does it for %s too, whichever it is', (category) => {
      const other = TRY_ON_CATEGORIES.find((candidate) => candidate !== category) ?? 'LIP';
      const { onChange } = setup({
        category: other,
        subCategory: TRY_ON_MAP[other][0],
      } as TTryOnSelection);
      const title = { LIP: 'Lips', EYE: 'Eyes', HAIR: 'Hair', FACE: 'Face', NAIL: 'Nails' }[
        category
      ];

      open(0);
      click(optionNamed(title));

      expect(onChange).toHaveBeenCalledWith({ category, subCategory: TRY_ON_MAP[category][0] });
    });

    it('does not say anything when the category that is chosen is the one it already is', () => {
      const { onChange } = setup({ category: 'LIP', subCategory: 'GLOSS' });

      open(0);
      click(optionNamed('Lips'));

      expect(onChange).not.toHaveBeenCalled();
    });

    it('can start from nothing', () => {
      const { onChange } = setup();

      open(0);
      click(optionNamed('Nails'));

      expect(onChange).toHaveBeenCalledWith({ category: 'NAIL', subCategory: TRY_ON_MAP.NAIL[0] });
    });
  });

  describe('choosing a subcategory', () => {
    it('keeps the category and changes the subcategory', () => {
      const { onChange } = setup({ category: 'EYE', subCategory: 'EYEBROW' });

      open(1);
      click(optionNamed('Eyeliner'));

      expect(onChange).toHaveBeenCalledTimes(1);
      expect(onChange).toHaveBeenCalledWith({ category: 'EYE', subCategory: 'EYELINER' });
    });

    it('does not say anything when it is the one it already is', () => {
      const { onChange } = setup({ category: 'EYE', subCategory: 'KAJAL' });

      open(1);
      // pressing the chosen option again would take the choice away: the field does not allow that
      click(optionNamed('Kajal'));

      expect(onChange).not.toHaveBeenCalledWith(expect.objectContaining({ subCategory: '' }));
      expect(onChange).not.toHaveBeenCalled();
    });
  });

  describe('its lists', () => {
    // A list is drawn in the body of the page, so it is behind the modal its field is in (`ModalWrapper`,
    // `z-100`) unless it is given a `z-` above it: this is what made the lists of the selectable modal
    // open and be hidden.
    it.each([0, 1])(
      'the list of the field %i has a `z-` above a modal and below the toasts',
      (index) => {
        setup({ category: 'LIP', subCategory: 'MATTE' });
        open(index);

        const list = required(
          document.querySelector('[role="listbox"]')?.closest('.fixed'),
          'the list that opened',
        );

        expect(list.className).toContain('z-110');
      },
    );
  });

  describe('taking the choice away', () => {
    it('is not possible: pressing the chosen category again does not clear it', () => {
      const { onChange } = setup({ category: 'LIP', subCategory: 'MATTE' });

      open(0);
      click(optionNamed('Lips'));

      expect(onChange).not.toHaveBeenCalled();
      expect(field(0).textContent).toContain('Lips');
    });
  });
});
