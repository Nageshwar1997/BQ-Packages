export type TDropdownPlacement = 'top' | 'bottom';

export interface IDropdownRect {
  top: number;
  bottom: number;
  left: number;
  width: number;
}

/** The gap between the field and the list. */
export const DROPDOWN_GAP = 8;

/**
 * Where a list that opens from a field goes: where the app asked (`desired`), unless that side of the
 * field has not room for the list and the other one has more. A list that fits on neither stays
 * where it was asked to open.
 *
 * @param needed how tall the list is, or the most it can be (its `max-height`).
 */
export const getDropdownPlacement = ({
  rect,
  viewportHeight,
  desired,
  needed,
}: {
  rect: Pick<IDropdownRect, 'top' | 'bottom'>;
  viewportHeight: number;
  desired: TDropdownPlacement;
  needed: number;
}): TDropdownPlacement => {
  const below = viewportHeight - rect.bottom - DROPDOWN_GAP;
  const above = rect.top - DROPDOWN_GAP;
  const room = desired === 'bottom' ? below : above;
  const other = desired === 'bottom' ? above : below;

  if (room >= needed || other <= room) return desired;

  return desired === 'bottom' ? 'top' : 'bottom';
};

/** The `style` of a list that is `position: fixed` under or over the field, as wide as it is. */
export const getDropdownStyle = (
  rect: IDropdownRect,
  placement: TDropdownPlacement,
  viewportHeight: number,
) => ({
  left: rect.left,
  width: rect.width,
  ...(placement === 'top'
    ? { bottom: viewportHeight - rect.top + DROPDOWN_GAP }
    : { top: rect.bottom + DROPDOWN_GAP }),
});
