import { Button } from '@beautinique/frontend-components';

interface ITryOnApplyBarProps {
  /** Closes the modal without applying anything. */
  onCancel: () => void;
  /** Gives the selection to the app and closes the modal. */
  onApply: () => void;
  /** There is nothing to apply until a category and a subcategory are chosen. */
  canApply: boolean;
}

/**
 * The end of the selectable modal. What the person tried is only given to the app by "Apply";
 * closing the modal any other way (this button, the cross, Escape, a press on the backdrop) leaves
 * what the app has as it was.
 */
const TryOnApplyBar = ({ onCancel, onApply, canApply }: ITryOnApplyBarProps) => (
  <div className="flex shrink-0 items-center justify-end gap-3">
    <Button pattern="secondary" content="Cancel" buttonProps={{ onClick: onCancel }} />
    <Button
      pattern="primary"
      content="Apply"
      buttonProps={{ onClick: onApply, disabled: !canApply }}
    />
  </div>
);

export default TryOnApplyBar;
