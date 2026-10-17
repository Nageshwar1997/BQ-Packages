import type { TTryOnSelection } from '@beautinique/frontend-types';
import type { ReactNode } from 'react';

import TryOnApplyBar from './TryOnApplyBar.js';
import TryOnSelection from './TryOnSelection.js';

interface ITryOnSelectableFrameProps {
  /** Without it the frame is not there: the content is the modal as a shopper sees it. */
  enabled: boolean;
  selection: TTryOnSelection | undefined;
  onSelect: (selection: TTryOnSelection) => void;
  onCancel: () => void;
  onApply: () => void;
  children: ReactNode;
}

/**
 * What a selectable modal has around the try-on: the two fields that choose what is tried on above
 * it, and "Cancel"/"Apply" under it. The try-on keeps the room that is left (`min-h-0 flex-1`).
 */
const TryOnSelectableFrame = ({
  enabled,
  selection,
  onSelect,
  onCancel,
  onApply,
  children,
}: ITryOnSelectableFrameProps) => {
  if (!enabled) {
    return children;
  }

  return (
    <div className="flex h-full w-full flex-col gap-3">
      <TryOnSelection selection={selection} onChange={onSelect} />
      <div className="min-h-0 flex-1">{children}</div>
      <TryOnApplyBar onCancel={onCancel} onApply={onApply} canApply={!!selection} />
    </div>
  );
};

export default TryOnSelectableFrame;
