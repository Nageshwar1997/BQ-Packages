/**
 * The option a person reaches by typing, for a list of options (a select, a menu): the next one whose
 * label starts with what was typed, looking from `fromIndex` on and starting over at the top.
 *
 * - Typing a letter that was just typed again (`"aaa"`) goes through the options that start with it,
 *   one at a time, as pressing the same key does in a native select.
 * - Several different letters (`"ban"`) look for an option that starts with all of them, beginning
 *   at the current one, so the choice does not leave it while it still matches.
 * - Options that cannot be chosen (`disabled`) are skipped.
 *
 * @returns the index of the option, or -1 when none matches.
 */
export const findTypeaheadMatch = (
  options: readonly { label: string; disabled?: boolean }[],
  typed: string,
  fromIndex: number,
) => {
  const text = typed.toLowerCase();

  if (!text || options.length === 0) return -1;

  const isRepeat = text.length > 1 && new Set(text).size === 1;
  const query = isRepeat ? text.slice(0, 1) : text;
  // one more letter of the same key: start after the current option, so it is not found again
  const start = isRepeat ? fromIndex + 1 : fromIndex;

  for (let step = 0; step < options.length; step += 1) {
    const index = (((start + step) % options.length) + options.length) % options.length;
    const option = options.at(index);

    if (option && !option.disabled && option.label.toLowerCase().startsWith(query)) return index;
  }

  return -1;
};

/** The next option that can be chosen from `from` going `step` (1 or -1), or -1 at the end of the list. */
export const findEnabledIndex = (
  options: readonly { disabled?: boolean }[],
  from: number,
  step: 1 | -1,
) => {
  for (let index = from + step; index >= 0 && index < options.length; index += step) {
    if (!options[index]?.disabled) return index;
  }

  return -1;
};
