import type { TTryOnSelection } from '@beautinique/frontend-types';
import { Icon } from '@iconify/react';

import { getEmptyStateCopy } from './emptyState.js';

interface ITryOnEmptyStateProps {
  /** What was given to the modal: nothing, or a selection of a category that has no stage yet. */
  tryOn: TTryOnSelection | undefined;
  /** The modal can be set up: with nothing chosen yet it asks for a choice. */
  selectable: boolean;
}

/**
 * What the modal shows in place of the try-on when there is nothing it can try on: no selection (a
 * product with no try-on, or a modal that is being set up and has none chosen yet), or a category this
 * version has no stage for. What it says is in `getEmptyStateCopy`.
 */
const TryOnEmptyState = ({ tryOn, selectable }: ITryOnEmptyStateProps) => {
  const { title, description } = getEmptyStateCopy(tryOn, selectable);

  return (
    <div className="mx-auto flex max-w-sm flex-col items-center gap-3 p-8 text-center">
      <span className="bg-primary/5 flex size-14 items-center justify-center rounded-2xl">
        <Icon icon="solar:hourglass-linear" className="text-primary/50 size-7" />
      </span>
      <p className="text-primary text-base font-semibold">{title}</p>
      <p className="text-tertiary text-sm">{description}</p>
    </div>
  );
};

export default TryOnEmptyState;
