import type { TTryOnCategory, TTryOnSelection } from '@beautinique/frontend-types';

/** What the modal says when there is nothing to try on: a heading and the sentence under it. */
export interface IEmptyStateCopy {
  readonly title: string;
  readonly description: string;
}

// The categories that have a stage (an engine and the screen for it) in this version of the package. It
// is a list of its own, and not the categories of the product: the product can get a sixth category
// before an app has the package that has a stage for it, and that selection is told "coming soon"
// instead of being drawn with the stage of another category. A `Set`, so that a text of the product
// that is none of them (`constructor`) is not found.
const STAGE_CATEGORIES: ReadonlySet<string> = new Set<TTryOnCategory>([
  'LIP',
  'FACE',
  'EYE',
  'HAIR',
  'NAIL',
]);

/**
 * Whether there is something to try on: a selection of a category that has a stage. It narrows
 * `tryOn` for the code that draws the stages, which reads its category without asking again.
 */
export const hasStage = (selection: TTryOnSelection | undefined): selection is TTryOnSelection =>
  selection !== undefined && STAGE_CATEGORIES.has(selection.category);

const CHOOSE: IEmptyStateCopy = {
  title: 'Choose what to try on',
  description: 'Choose a category and a subcategory above to start.',
};

const NOT_AVAILABLE: IEmptyStateCopy = {
  title: 'Try-On not available',
  description: 'This product has no Try-On configured yet.',
};

/**
 * What the empty state says. A selection that has no stage is "coming soon". With no selection at all,
 * the modal that can be set up (`selectable`) asks for one, and the one a shopper sees says the product
 * has no try-on yet.
 */
export const getEmptyStateCopy = (
  tryOn: TTryOnSelection | undefined,
  selectable: boolean,
): IEmptyStateCopy => {
  if (tryOn) {
    return { title: 'Coming soon', description: `Try-on for ${tryOn.category} is coming soon.` };
  }

  return selectable ? CHOOSE : NOT_AVAILABLE;
};
