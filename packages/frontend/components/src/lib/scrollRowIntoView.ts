/**
 * Scrolls `list` just enough to show `row` (an element inside it), and nothing else: the page is not
 * moved, as `scrollIntoView()` would do, and it works where that function does not exist. `list`
 * must be the `offsetParent` of the row (give it `position: relative`).
 */
export const scrollRowIntoView = (list: HTMLElement, row: HTMLElement) => {
  const top = row.offsetTop;
  const bottom = top + row.offsetHeight;

  if (top < list.scrollTop) list.scrollTop = top;
  else if (bottom > list.scrollTop + list.clientHeight) list.scrollTop = bottom - list.clientHeight;
};
