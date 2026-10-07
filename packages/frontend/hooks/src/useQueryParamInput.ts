import { useCallback, useMemo, useState } from 'react';

import { useDebounce } from './useDebounce.js';
import { useQueryParams } from './useQueryParams.js';

export interface IUseQueryParamInputOptions {
  /** How long to wait after the last keystroke before the URL is updated, in ms. @default 600 */
  delay?: number;
}

/**
 * A text box that is mirrored in a URL query param (a search box and `?search=...`).
 *
 * - Typing shows in the box straight away; the URL is updated `delay` ms after the last keystroke
 *   (trimmed, and the param is removed when the text is empty).
 * - When the URL param changes on its own - another filter resets it, the user presses Back/Forward,
 *   a "Clear" button - the box follows it. The URL update this box made itself coming back does not
 *   touch the box, so whatever the user is still typing (a trailing space, the next letters) stays.
 * - A typed text that is waiting for its debounce is dropped if the box was changed in the meantime
 *   (reset by another filter, or `clear()`), so it cannot put an old search back into the URL.
 *
 * ```tsx
 * const search = useQueryParamInput('search');
 *
 * <input value={search.value} onChange={(event) => search.setValue(event.target.value)} />
 * <button onClick={search.clear}>Clear</button>
 * ```
 *
 * Needs to be rendered inside a React Router (`react-router-dom`) router.
 *
 * @param key - The query param the box is mirrored in.
 */
export const useQueryParamInput = (
  key: string,
  { delay = 600 }: IUseQueryParamInputOptions = {},
) => {
  const { queryParams, setParams, removeParams } = useQueryParams();
  const urlValue = queryParams[key] ?? '';

  const [value, setInputValue] = useState(urlValue);
  // The value this box last wrote to the URL, and the URL value it has already looked at.
  const [lastSent, setLastSent] = useState(urlValue);
  const [seenUrlValue, setSeenUrlValue] = useState(urlValue);

  // The URL param changed. If it is not the value this box sent, something else changed it: follow it.
  if (urlValue !== seenUrlValue) {
    setSeenUrlValue(urlValue);

    if (urlValue !== lastSent) {
      setInputValue(urlValue);
      setLastSent(urlValue);
    }
  }

  const { trigger, cancel } = useDebounce({
    callback: (typed: string) => {
      // The box was changed since this text was typed (the URL changed under it and the box followed,
      // which cannot cancel a timer while rendering): it is stale. `clear()` cancels explicitly.
      if (typed !== value) return;

      const trimmed = typed.trim();
      setLastSent(trimmed);

      if (trimmed) {
        setParams({ [key]: trimmed });
      } else {
        removeParams([key]);
      }
    },
    delay,
  });

  /** Shows `next` in the box right away (leading whitespace removed) and writes it to the URL after the delay. */
  const setValue = useCallback(
    (next: string) => {
      const typed = next.trimStart();
      setInputValue(typed);
      trigger(typed);
    },
    [trigger],
  );

  /** Empties the box right away and drops any typed text still waiting for its debounce. It does not touch the URL. */
  const clear = useCallback(() => {
    cancel();
    setInputValue('');
    setLastSent('');
  }, [cancel]);

  return useMemo(() => ({ value, setValue, clear }), [value, setValue, clear]);
};
