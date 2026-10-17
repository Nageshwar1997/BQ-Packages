import { Select } from '@beautinique/frontend-components';
import { TRY_ON_CATEGORIES, TRY_ON_MAP } from '@beautinique/frontend-constants';
import type { TTryOnCategory, TTryOnSelection } from '@beautinique/frontend-types';

import { TRYON_CATEGORY_OPTIONS } from '../constants/index.js';

interface ITryOnSelectionProps {
  /** What is being tried on now (`undefined`: nothing chosen yet). */
  selection: TTryOnSelection | undefined;
  /** Called with the new, complete selection (a category always comes with one of its subcategories). */
  onChange: (selection: TTryOnSelection) => void;
}

// `COMPACTPOWDER` -> "Compactpowder", `LIP_GLOSS` -> "Lip gloss": the token made readable, the same way
// the context chip over the canvas writes it.
const readable = (token: string) => {
  const text = token.replaceAll('_', ' ').toLowerCase();

  return `${text.charAt(0).toUpperCase()}${text.slice(1)}`;
};

// The fields are in the modal (`ModalWrapper`, `z-100`) and their lists are drawn in the body, where a
// list is behind the modal unless it is given a `z-` above it. `z-110` is above a modal, and below the
// toasts (`z-999`).
const LIST_CLASS_NAME = 'z-110';

const CATEGORY_OPTIONS = TRYON_CATEGORY_OPTIONS.map(({ category, title }) => ({
  label: title,
  value: category,
}));

const isCategory = (value: string | number): value is TTryOnCategory =>
  TRY_ON_CATEGORIES.some((category) => category === value);

/**
 * The two fields of the selectable modal: the category and, under it, the subcategory. Choosing
 * another category chooses the first subcategory of it (a selection is always complete), so there
 * is never a moment in which the modal has a category and nothing to try on.
 */
const TryOnSelection = ({ selection, onChange }: ITryOnSelectionProps) => {
  const subCategories: readonly string[] = selection ? TRY_ON_MAP[selection.category] : [];

  return (
    <div role="group" aria-label="What to try on" className="grid shrink-0 grid-cols-2 gap-3">
      <Select
        label="Category"
        clearable={false}
        optionsClassName={LIST_CLASS_NAME}
        selectProps={{
          value: selection?.category ?? '',
          placeholder: 'Choose a category',
          onChange: (value) => {
            if (!isCategory(value) || value === selection?.category) {
              return;
            }

            const [first] = TRY_ON_MAP[value];

            // the first one always exists: every category of the map has subcategories
            onChange({ category: value, subCategory: first } as TTryOnSelection);
          },
        }}
        options={CATEGORY_OPTIONS}
      />
      <Select
        label="Subcategory"
        clearable={false}
        optionsClassName={LIST_CLASS_NAME}
        selectProps={{
          value: selection?.subCategory ?? '',
          placeholder: 'Choose a subcategory',
          disabled: !selection,
          onChange: (value) => {
            // Not for the one that is chosen already: the modal would let go of its engine for a
            // selection that did not change, and nothing would start a new one.
            if (
              !selection ||
              typeof value !== 'string' ||
              value === selection.subCategory ||
              !subCategories.includes(value)
            ) {
              return;
            }

            onChange({ category: selection.category, subCategory: value } as TTryOnSelection);
          },
        }}
        options={subCategories.map((subCategory) => ({
          label: readable(subCategory),
          value: subCategory,
        }))}
      />
    </div>
  );
};

export default TryOnSelection;
