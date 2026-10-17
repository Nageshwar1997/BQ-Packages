// @vitest-environment jsdom
import { TRY_ON_MAP } from '@beautinique/frontend-constants';
import type { TTryOnSelection } from '@beautinique/frontend-types';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { required } from '../test-utils/dom.js';
import { mount, unmountAll } from '../test-utils/react.js';
import TryOnSelection from './TryOnSelection.js';

/*
 * The real fields only ever give one of their own options, so what the component does with a value that
 * is not one of them cannot be reached by clicking. The fields are replaced by stand-ins that hand over
 * the function they were given: here a value that the component should not trust is passed in on purpose.
 */
const fields = vi.hoisted(() => {
  const onChange: Record<string, (value: string | number) => void> = {};

  return { onChange };
});

vi.mock('@beautinique/frontend-components', () => ({
  Select: ({
    label,
    selectProps,
  }: {
    label: string;
    selectProps: { onChange: (value: string | number) => void };
  }) => {
    fields.onChange[label] = selectProps.onChange;

    return null;
  },
}));

const LIP: TTryOnSelection = { category: 'LIP', subCategory: 'MATTE' };

const setup = (selection?: TTryOnSelection) => {
  const onChange = vi.fn();

  mount(<TryOnSelection selection={selection} onChange={onChange} />);

  return {
    onChange,
    category: (value: string | number) => {
      required(fields.onChange.Category, 'the category field')(value);
    },
    subCategory: (value: string | number) => {
      required(fields.onChange.Subcategory, 'the subcategory field')(value);
    },
  };
};

describe('TryOnSelection with a value that is not one of its options', () => {
  beforeEach(() => {
    fields.onChange = {};
  });

  afterEach(() => {
    unmountAll();
  });

  it.each([['NOT_A_CATEGORY'], [''], [3]])('ignores %j as a category', (value) => {
    const { onChange, category } = setup(LIP);

    category(value);

    expect(onChange).not.toHaveBeenCalled();
  });

  it('takes a category of the product, with the first subcategory of it', () => {
    const { onChange, category } = setup(LIP);

    category('EYE');

    expect(onChange).toHaveBeenCalledExactlyOnceWith({
      category: 'EYE',
      subCategory: TRY_ON_MAP.EYE[0],
    });
  });

  it.each([['NOT_A_SUBCATEGORY'], [''], [3]])('ignores %j as a subcategory', (value) => {
    const { onChange, subCategory } = setup(LIP);

    subCategory(value);

    expect(onChange).not.toHaveBeenCalled();
  });

  it('ignores a subcategory of another category (the eyeliner is not a lip makeup)', () => {
    const { onChange, subCategory } = setup(LIP);

    subCategory('EYELINER');

    expect(onChange).not.toHaveBeenCalled();
  });

  it('takes another subcategory of the category that is chosen', () => {
    const { onChange, subCategory } = setup(LIP);
    const other = required(TRY_ON_MAP.LIP.find((name) => name !== 'MATTE'));

    subCategory(other);

    expect(onChange).toHaveBeenCalledExactlyOnceWith({ category: 'LIP', subCategory: other });
  });

  it('gives nothing for a subcategory while no category is chosen', () => {
    const { onChange, subCategory } = setup();

    subCategory('MATTE');

    expect(onChange).not.toHaveBeenCalled();
  });
});
